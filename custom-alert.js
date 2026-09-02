// custom-alert.js

// Buat elemen HTML untuk modal dan masukkan ke dalam <body>
const modalHTML = `
  <div id="global-modal-overlay">
    <div id="global-modal-box">
      <h3 id="global-modal-title">Info</h3>
      <p id="global-modal-message">Pesan disini</p>
      <div id="global-modal-actions" style="display: flex; gap: 10px; justify-content: center;">
        <button id="global-btn-cancel" class="global-modal-btn btn-danger" style="display:none;">Batal</button>
        <button id="global-btn-ok" class="global-modal-btn btn-primary">OK</button>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

const overlay = document.getElementById('global-modal-overlay');
const titleEl = document.getElementById('global-modal-title');
const msgEl = document.getElementById('global-modal-message');
const btnOk = document.getElementById('global-btn-ok');
const btnCancel = document.getElementById('global-btn-cancel');

// Fungsi Custom Alert (Pengganti alert)
export function showAlert(message, title = "Informasi") {
  titleEl.innerText = title;
  msgEl.innerText = message;
  btnCancel.style.display = 'none'; // Sembunyikan tombol batal
  
  btnOk.onclick = () => closeGlobalModal();
  openGlobalModal();
}

// Fungsi Custom Confirm (Pengganti confirm)
export function showConfirm(message, onConfirmCallback, title = "Konfirmasi") {
  titleEl.innerText = title;
  msgEl.innerText = message;
  btnCancel.style.display = 'block'; // Tampilkan tombol batal
  
  btnOk.onclick = () => {
    closeGlobalModal();
    onConfirmCallback(); // Jalankan perintah jika OK ditekan
  };
  
  btnCancel.onclick = () => closeGlobalModal();
  openGlobalModal();
}

function openGlobalModal() {
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('show'), 10);
}

function closeGlobalModal() {
  overlay.classList.remove('show');
  setTimeout(() => overlay.style.display = 'none', 300);
}
