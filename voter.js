import { showAlert, showConfirm } from './custom-alert.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Fungsi untuk mencegah serangan XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Fungsi untuk mengenkripsi password (SHA-256)
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const firebaseConfig = {
  apiKey: "AIzaSyB1Ab-K6ehYQZbjX-QxJQiodqSajGPFdmE",
  authDomain: "pemilihan-ketos-2627.firebaseapp.com",
  projectId: "pemilihan-ketos-2627",
  storageBucket: "pemilihan-ketos-2627.firebasestorage.app",
  messagingSenderId: "924205874158",
  appId: "1:924205874158:web:be0bab0495c02d1182acff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentVoterDocId = null;

document.getElementById('voter-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true; // Cegah double submit login
  submitBtn.innerText = "Memproses...";

  const nis = document.getElementById('voter-nis').value.trim();
  const plainPassword = document.getElementById('voter-password').value.trim();
  const hashedPassword = await hashPassword(plainPassword); // Hash password yang diketik

  try {
    // Gunakan hashedPassword untuk mencocokkan ke database
    const q = query(collection(db, "voters"), where("nis", "==", nis), where("password", "==", hashedPassword));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      showAlert("NIS atau Password salah!", "Login Gagal");
      submitBtn.disabled = false;
      submitBtn.innerText = "Masuk & Mulai Memilih";
      return;
    }

    let voterData = null;
    querySnapshot.forEach((docSnap) => {
      currentVoterDocId = docSnap.id;
      voterData = docSnap.data();
    });

    if (voterData.status !== "aktif") {
      showAlert("Akun ini sudah digunakan untuk memilih atau sedang dinonaktifkan!", "Akses Ditolak");
      submitBtn.disabled = false;
      submitBtn.innerText = "Masuk & Mulai Memilih";
      return;
    }

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('voting-section').style.display = 'block';
    document.getElementById('voter-name-display').innerText = escapeHTML(voterData.nama);

    loadCandidates(voterData.pemilihanId);
  } catch (error) {
    console.error("Error login:", error);
    showAlert("Terjadi kesalahan sistem saat mencoba login.", "Error");
    submitBtn.disabled = false;
    submitBtn.innerText = "Masuk & Mulai Memilih";
  }
});

async function loadCandidates(pemilihanId) {
  const container = document.getElementById('candidates-list');
  container.innerHTML = "<p style='text-align:center; grid-column: 1 / -1;'>Memuat kandidat, mohon tunggu...</p>";
  
  try {
    let q;
    if (pemilihanId) {
      q = query(collection(db, "candidates"), where("pemilihanId", "==", pemilihanId));
    } else {
      q = collection(db, "candidates");
    }

    let querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty && pemilihanId) {
      const fallbackSnap = await getDocs(collection(db, "candidates"));
      if (!fallbackSnap.empty) {
        querySnapshot = fallbackSnap;
      }
    }

    if (querySnapshot.empty) {
      container.innerHTML = "<p style='text-align:center; color:red; font-weight:bold; grid-column: 1 / -1;'>Belum ada kandidat yang terdaftar di sistem. Tunggu arahan Admin.</p>";
      return;
    }

    container.innerHTML = ""; 
    const candidates = [];
    querySnapshot.forEach(d => candidates.push({ id: d.id, ...d.data() }));
    candidates.sort((a,b) => a.noUrut - b.noUrut); 

    candidates.forEach((data) => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      
      // Menggunakan kelas .candidate-vision agar teks panjang otomatis turun dan kotak membesar
      card.innerHTML = `
  <img src="${escapeHTML(data.foto) || 'Assets/img/logo_osis.png'}" alt="Kandidat">
  <h3>No. Urut ${data.noUrut}</h3>
  <p style="font-weight:bold; font-size:1.1rem; margin:5px 0;">${escapeHTML(data.nama)}</p>
  
  <!-- Menggunakan class khusus agar kotak membesar dan teks turun -->
  <div class="candidate-vision-box">
    <strong>Visi & Misi:</strong><br>${escapeHTML(data.visi)}
  </div>

  <button class="btn-primary vote-btn" style="width:100%;">Pilih Kandidat</button>
`;


      const voteButton = card.querySelector('button');

      voteButton.addEventListener('click', () => {
        showConfirm("Apakah Anda yakin dengan pilihan ini? Suara tidak dapat diubah setelah dikonfirmasi.", async () => {
          
          document.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
          voteButton.innerText = "Mengirim Suara...";
          
          const now = new Date();
          const timeString = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;

          try {
            await runTransaction(db, async (transaction) => {
              const voterRef = doc(db, "voters", currentVoterDocId);
              const candidateRef = doc(db, "candidates", data.id);

              const voterDoc = await transaction.get(voterRef);
              if (voterDoc.data().sudahVote) {
                throw new Error("Anda sudah menggunakan hak suara!");
              }

              transaction.update(candidateRef, { suara: increment(1) });
              transaction.update(voterRef, {
                status: "nonaktif",
                sudahVote: true,
                choosedCandidate: data.id,
                waktuVote: timeString
              });
            });

            document.getElementById('voting-section').innerHTML = `
              <div style="text-align:center; padding: 50px;">
                <h2 style="color: var(--success); margin-bottom: 10px;">Suara Berhasil Dikirim!</h2>
                <p>Terima kasih telah menggunakan hak suara Anda.</p>
                <p style="color: gray; font-size: 0.9rem; margin-top: 20px;">Mengembalikan ke menu utama...</p>
              </div>
            `;

            setTimeout(() => {
              document.getElementById('voting-section').style.display = 'none';
              document.getElementById('login-section').style.display = 'block';
              document.getElementById('voter-login-form').reset();
              currentVoterDocId = null;
            }, 2000);

          } catch (error) {
            console.error("Kesalahan update suara:", error);
            showAlert(error.message || "Terjadi kesalahan jaringan, silakan coba lagi.", "Error");
            document.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = false);
            voteButton.innerText = "Pilih Kandidat";
          }
        }, "Konfirmasi Pilihan");
      });

      container.appendChild(card);
    });

  } catch (error) {
    console.error("Gagal memuat kandidat:", error);
    container.innerHTML = "<p style='text-align:center; color:red; font-weight:bold; grid-column: 1 / -1;'>Terjadi kesalahan server saat memuat daftar kandidat.</p>";
  }
}
