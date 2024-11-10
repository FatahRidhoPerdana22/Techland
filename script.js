const firebaseConfig = {
  apiKey: "AIzaSyALEiCheaysxJ-YZpxBVwS_gCQtRlmHeiQ",
  authDomain: "techland-5135e.firebaseapp.com",
  databaseURL: "https://techland-5135e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "techland-5135e",
  storageBucket: "techland-5135e.appspot.com",
  messagingSenderId: "771891375242",
  appId: "1:771891375242:web:5e9129bda6795ad4309173",
  measurementId: "G-1ER8JQ5VPE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Initialize Realtime Database and get a reference to the service
var diedit = false;
var database = firebase.database();
var storage = firebase.storage();

var dataRef = database.ref('tanaman');
dataRef.once('value', function (snapshot) {
  var Count = snapshot.numChildren();
  document.getElementById('count').innerText = Count;
});

 // Referensi Data
 const phRef = database.ref('Monitoring/ph');
 const lembabRef = database.ref('Monitoring/kelembapan');
 const waktuRef = database.ref('Monitoring/waktu');

 // Mendapatkan Data PH
 phRef.orderByKey().limitToLast(1).on('value', function(snapshot) {
     snapshot.forEach(function(childSnapshot) {
         const ph = childSnapshot.val();
         document.getElementById('ph').innerText = ph.toFixed(2); // Menampilkan 2 desimal untuk PH
     });
 });

 // Mendapatkan Data Kelembaban
 lembabRef.orderByKey().limitToLast(1).on('value', function(snapshot) {
     snapshot.forEach(function(childSnapshot) {
         const lembab = childSnapshot.val() + "%";
         document.getElementById('lembab').innerText = lembab;
     });
 });

 // Mendapatkan Data Waktu
 waktuRef.orderByKey().limitToLast(1).on('value', function(snapshot) {
     snapshot.forEach(function(childSnapshot) {
         const waktu = childSnapshot.val();
         const date = moment(waktu, "DD MM YYYY HH:mm:ss").format("DD MMMM YYYY HH:mm:ss");
         document.getElementById('waktu').innerText = date;
     });
 });

 // Fungsi untuk menghitung exponential smoothing
function exponentialSmoothing(data, alpha) {
  let result = [data[0]]; // Set nilai awal dengan data pertama
  for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Konfigurasi Chart.js untuk PH
function createPhChart(data) {
  const ctx = document.getElementById('expPh').getContext('2d');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: data.map((_, index) => index + 1), // Buat label sebagai indeks data
          datasets: [{
              label: 'Exponential PH',
              data: data,
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(75, 192, 192, 0.2)'
          }]
      },
      options: {
          responsive: true,
          scales: {
              x: { display: true },
              y: { display: true }
          }
      }
  });
}

// Konfigurasi Chart.js untuk Kelembaban
function createLembabChart(data) {
  const ctx = document.getElementById('expLembab').getContext('2d');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: data.map((_, index) => index + 1), // Buat label sebagai indeks data
          datasets: [{
              label: 'Exponential Kelembaban',
              data: data,
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(153, 102, 255, 0.2)'
          }]
      },
      options: {
          responsive: true,
          scales: {
              x: { display: true },
              y: { display: true }
          }
      }
  });
}

// Mengambil data PH dan Kelembaban dari Firebase
let phData = [];
let lembabData = [];

phRef.orderByKey().on('value', function(snapshot) {
  phData = [];
  snapshot.forEach(function(childSnapshot) {
      phData.push(childSnapshot.val());
  });
  const alpha = 0.5; // Koefisien smoothing, bisa disesuaikan
  const smoothedPhData = exponentialSmoothing(phData, alpha);
  createPhChart(smoothedPhData);
});

lembabRef.orderByKey().on('value', function(snapshot) {
  lembabData = [];
  snapshot.forEach(function(childSnapshot) {
      lembabData.push(childSnapshot.val());
  });
  const alpha = 0.5; // Koefisien smoothing, bisa disesuaikan
  const smoothedLembabData = exponentialSmoothing(lembabData, alpha);
  createLembabChart(smoothedLembabData);
});

// Fungsi untuk menghapus data tertua jika lebih dari 100 entri
function removeOldestData(ref) {
  ref.orderByKey().limitToFirst(1).once('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
          childSnapshot.ref.remove();
      });
  });
}

// Mengambil data PH dan Kelembaban dari Firebase dengan penghapusan data lama
const maxEntries = 100;

phRef.orderByKey().on('value', function(snapshot) {
  if (snapshot.numChildren() > maxEntries) {
      removeOldestData(phRef);
  }
  phData = [];
  phLabels = [];
  snapshot.forEach(function(childSnapshot) {
      const data = childSnapshot.val();
      phData.push(data.ph);
      phLabels.push(moment(data.timestamp).format('HH:mm'));
  });
  const alpha = 0.5; // Koefisien smoothing, bisa disesuaikan
  const smoothedPhData = exponentialSmoothing(phData, alpha);
  createPhChart(smoothedPhData, phLabels);
});

lembabRef.orderByKey().on('value', function(snapshot) {
  if (snapshot.numChildren() > maxEntries) {
      removeOldestData(lembabRef);
  }
  lembabData = [];
  lembabLabels = [];
  snapshot.forEach(function(childSnapshot) {
      const data = childSnapshot.val();
      lembabData.push(data.kelembapan);
      lembabLabels.push(moment(data.timestamp).format('HH:mm'));
  });
  const alpha = 0.5; // Koefisien smoothing, bisa disesuaikan
  const smoothedLembabData = exponentialSmoothing(lembabData, alpha);
  createLembabChart(smoothedLembabData, lembabLabels);
});



function movingAverage(data, windowSize) {
  let result = [];
  for (let i = 0; i < data.length - windowSize + 1; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += data[i + j];
    }
    result.push(sum / windowSize);
  }
  return result;
}


// Konfigurasi Chart.js untuk Moving Average PH
function createMovingAveragePhChart(data) {
  const ctx = document.getElementById('movPh').getContext('2d');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: data.map((_, index) => index + 1), // Buat label sebagai indeks data
          datasets: [{
              label: 'Moving Average PH',
              data: data,
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(255, 99, 132, 0.2)'
          }]
      },
      options: {
          responsive: true,
          scales: {
              x: { display: true },
              y: { display: true }
          }
      }
  });
}

function createMovingAverageLembabChart(data) {
  const ctx = document.getElementById('movLembab').getContext('2d');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: data.map((_, index) => index + 1), // Buat label sebagai indeks data
          datasets: [{
              label: 'Moving Average Kelembaban',
              data: data,
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(54, 162, 235, 0.2)'
          }]
      },
      options: {
          responsive: true,
          scales: {
              x: { display: true },
              y: { display: true }
          }
      }
  });
}


// Konfigurasi Chart.js untuk Moving Average Kelembaban
function createMovingAverageLembabChart(data) {
  const ctx = document.getElementById('movLembab').getContext('2d');
  new Chart(ctx, {
      type: 'line',
      data: {
          labels: data.map((_, index) => index + 1), // Buat label sebagai indeks data
          datasets: [{
              label: 'Moving Average Kelembaban',
              data: data,
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(54, 162, 235, 0.2)'
          }]
      },
      options: {
          responsive: true,
          scales: {
              x: { display: true },
              y: { display: true }
          }
      }
  });
}


const windowSize = 5; // Ukuran data titik untuk Moving Average, bisa disesuaikan

phRef.orderByKey().on('value', function(snapshot) {
  if (snapshot.numChildren() > maxEntries) {
      removeOldestData(phRef);
  }
  let phData = [];
  snapshot.forEach(function(childSnapshot) {
      phData.push(childSnapshot.val());
  });
  const movingAveragePhData = movingAverage(phData, windowSize);
  createMovingAveragePhChart(movingAveragePhData);
});

lembabRef.orderByKey().on('value', function(snapshot) {
  if (snapshot.numChildren() > maxEntries) {
      removeOldestData(lembabRef);
  }
  let lembabData = [];
  snapshot.forEach(function(childSnapshot) {
      lembabData.push(childSnapshot.val());
  });
  const movingAverageLembabData = movingAverage(lembabData, windowSize);
  createMovingAverageLembabChart(movingAverageLembabData);
});



// Fungsi untuk mengubah status di database
function toggleStatus() {
  // Mendapatkan status saat ini dari database
  database.ref('status').once('value').then(function (statusSnapshot) {
    var valStatus = statusSnapshot.val().kondisi; // Mendapatkan nilai saat ini

    // Mendapatkan nilai saat ini dari onoff
    database.ref('onoff').once('value').then(function (onoffSnapshot) {
      var valOnOff = onoffSnapshot.val().val; // Mendapatkan nilai saat ini

      // Jika kondisi adalah otomatis (true) dan onoff adalah on (0)
      if (valStatus === true && valOnOff === 0) {
        // Memperbarui status menjadi manual (false) dan onoff menjadi off (1)
        database.ref('status').update({ kondisi: false }).then(function () {
          return database.ref('onoff').update({ val: 1 });
        }).then(function () {
          // Mengupdate tampilan link dan ikon sesuai dengan nilai yang baru
          updateButtonStatus(false);
          updateToggleUI(1);
          location.reload();
        }).catch(function (error) {
          console.error("Error updating values: ", error);
        });
      } else {
        // Jika tidak memenuhi kondisi, cukup toggle status
        var updatedStatus = valStatus === true ? false : true;

        database.ref('status').update({ kondisi: updatedStatus }).then(function () {
          // Mengupdate tampilan link dan ikon sesuai dengan nilai yang baru
          updateButtonStatus(updatedStatus);
          updateToggleUI();
          location.reload();
        }).catch(function (error) {
          console.error("Error updating status value: ", error);
        });
      }
    }).catch(function (error) {
      console.error("Error getting onoff data: ", error);
    });
  }).catch(function (error) {
    console.error("Error getting status data: ", error);
  });
}

function updateButtonStatus(kondisi) {
  // Memperbarui tampilan tombol berdasarkan status
  const button = document.getElementById('toggleButton');

  if (kondisi === true) {
    button.classList.remove('btn-secondary');
    button.classList.add('btn-success');
    button.innerText = 'Otomatis';
  } else {
    button.classList.remove('btn-success');
    button.classList.add('btn-secondary');
    button.innerText = 'Manual';
  }
}

function toggleOnOff() {
  var dbRef = firebase.database().ref('onoff');

  // Mendapatkan snapshot dari data onoff
  dbRef.once('value').then(function (snapshot) {
    var currentVal = snapshot.val().val; // Mendapatkan nilai saat ini

    // Memutakhirkan nilai sesuai kondisi
    var updatedVal = currentVal === 0 ? 1 : 0;

    // Memperbarui nilai di Firebase Realtime Database
    dbRef.update({ val: updatedVal }).then(function () {
      // Mengupdate tampilan link dan ikon sesuai dengan nilai yang baru
      updateToggleUI(updatedVal);
    }).catch(function (error) {
      console.error("Error updating onoff value: ", error);
    });
  }).catch(function (error) {
    console.error("Error getting onoff data: ", error);
  });
}

function updateToggleUI(val) {
  var toggleIcon = document.getElementById('toggleIcon');
  var toggleText = document.getElementById('toggleText');
  var toggleLink = document.getElementById('toggleLink');

  if (val === 0) {
    // Jika val adalah 0 (ON), update tampilan menjadi OFF
    toggleIcon.classList.remove('fa-toggle-off');
    toggleIcon.classList.add('fa-toggle-on');
    toggleText.textContent = 'ON';
  } else {
    // Jika val adalah 1 (OFF), update tampilan menjadi ON
    toggleIcon.classList.remove('fa-toggle-on');
    toggleIcon.classList.add('fa-toggle-off');
    toggleText.textContent = 'OFF';
  }

  // Menonaktifkan tautan jika kondisi toggleStatus adalah true
  database.ref('status').once('value').then(function (snapshot) {
    var kondisi = snapshot.val().kondisi;
    if (kondisi === true) {
      toggleLink.style.pointerEvents = 'none';  // Menonaktifkan tautan
      toggleLink.style.opacity = '0.5';  // Mengatur opasitas tautan
    } else {
      toggleLink.style.pointerEvents = 'auto';  // Mengaktifkan tautan
      toggleLink.style.opacity = '1';  // Mengatur opasitas tautan
    }
  }).catch(function (error) {
    console.error("Error getting status data: ", error);
  });
}

function notifikasi() {
  // Ambil referensi ke node "notifikasi" di database
  document.getElementById("notificationSelect").addEventListener("change", function() {
    var selectedValue = this.value;
    var notifikasiDropdown = document.getElementById('notifikasi');
    notifikasiDropdown.innerHTML = ""; // Bersihkan notifikasi sebelum menambahkan yang baru
  
    // Variabel yang menyimpan path node yang akan diambil dari Firebase berdasarkan pilihan
    var nodePath = "";
    var nodeDatetime = "";
  
    // Tentukan path node berdasarkan pilihan yang dipilih
    switch(selectedValue) {
        case "1":
            nodePath = "notifikasi/pump";
            nodeDatetime = "notifikasi/datetime/pump";
            break;
        case "2":
            nodePath = "notifikasi/lembab";
            nodeDatetime = "notifikasi/datetime/lembab";
            break;
        case "3":
            nodePath = "notifikasi/ph";
            nodeDatetime = "notifikasi/datetime/ph";
            break;
        default:
            console.error("Pilihan tidak valid");
            return;
    }
  
    // Ambil data notifikasi dan datetime dari Firebase berdasarkan path yang ditentukan
    var notifikasiRef = database.ref(nodePath).orderByKey().limitToLast(20);
    var datetimeRef = database.ref(nodeDatetime).orderByKey().limitToLast(20);

    // Gabungkan dua promise untuk mendapatkan kedua data secara bersamaan
    Promise.all([notifikasiRef.once('value'), datetimeRef.once('value')])
    .then(function(snapshotArray) {
        var pesanArray = []; // Array untuk menyimpan pesan-pesan
        var datetimeArray = []; // Array untuk menyimpan datetime
        
        // Proses snapshot untuk pesan
        snapshotArray[0].forEach(function(childSnapshot) {
            var pesan = childSnapshot.val();
            pesanArray.unshift(pesan); // Menambahkan pesan ke awal array agar urutan terbalik
        });

        snapshotArray[1].forEach(function(childSnapshot) {
          var datetime = childSnapshot.val();
          if (!datetimeArray.includes(datetime)) {
              datetimeArray.unshift(datetime); // Menambahkan datetime ke awal array agar urutan terbalik
          }
      });

      // Setelah mendapatkan semua pesan dan datetime, tambahkan ke dropdown dalam urutan terbalik
      for (var i = 0; i < Math.min(pesanArray.length, datetimeArray.length); i++) {
          var pesanElement = document.createElement('a');
          pesanElement.classList.add('dropdown-item');
      
          // Menambahkan text content untuk pesan
          var pesanText = document.createElement('span');
          pesanText.textContent = pesanArray[i];
          pesanElement.appendChild(pesanText);
      
          var br = document.createElement('br');
          pesanElement.appendChild(br);
      
          var currentTime = new Date();
          var datetimeParts = datetimeArray[i].split(/[\/ :]/); // Memisahkan string waktu menjadi bagian-bagian
          var day = parseInt(datetimeParts[0]);
          var month = parseInt(datetimeParts[1]) - 1; // dikurangi 1 karena bulan dimulai dari 0 di objek Date
          var year = parseInt(datetimeParts[2]);
          var hour = parseInt(datetimeParts[3]);
          var minute = parseInt(datetimeParts[4]);
          var second = parseInt(datetimeParts[5]);

          var databaseTime = new Date(year, month, day, hour, minute, second); // Membuat objek Date berdasarkan bagian-bagian waktu
                
          // Menghitung selisih waktu dalam milidetik
          var differenceSeconds = (currentTime.getTime() - databaseTime.getTime()) / 1000; // Mengubah ke detik
                
          var absoluteDifference = Math.abs(differenceSeconds);
                
          // Inisialisasi variabel untuk menyimpan string representasi waktu
          var timeString = '';
                
          // Cek jika selisih waktu lebih dari 60 detik
          if (absoluteDifference < 60) {
              timeString = Math.round(absoluteDifference) + ' detik yang lalu';
          } else {
              // Konversi ke menit jika lebih dari 60 detik
              var differenceMinutes = absoluteDifference / 60;
              if (differenceMinutes < 60) {
                  timeString = Math.round(differenceMinutes) + ' menit yang lalu';
              } else {
                  // Konversi ke jam jika lebih dari 60 menit
                  var differenceHours = differenceMinutes / 60;
                  if (differenceHours < 24) {
                      timeString = Math.round(differenceHours) + ' jam yang lalu';
                  } else {
                      // Konversi ke hari jika lebih dari 24 jam
                      var differenceDays = differenceHours / 24;
                      timeString = Math.round(differenceDays) + ' hari yang lalu';
                  }
              }
          }
          
          // Menambahkan text content untuk selisih waktu
          var selisihText = document.createElement('span');
          selisihText.textContent = ' ' + timeString;
          pesanElement.appendChild(selisihText);
      
          notifikasiDropdown.appendChild(pesanElement);
      
          var dividerElement = document.createElement('div');
          dividerElement.classList.add('dropdown-divider');
          notifikasiDropdown.appendChild(dividerElement);
      }
    })
    .catch(function(error) {
        console.error("Gagal mengambil data notifikasi:", error);
    });  
  });
}

notifikasi()

var nodeRefs = [
database.ref('notifikasi/pump'),
database.ref('notifikasi/lembab'),
database.ref('notifikasi/ph'),
database.ref('notifikasi/datetime/pump'),
database.ref('notifikasi/datetime/lembab'),
database.ref('notifikasi/datetime/ph')
];

// Fungsi untuk menghapus data terlama pada setiap node
function hapusDataTerlama() {
const waktuSekarang = Date.now();

nodeRefs.forEach(ref => {
  // Ambil data dari node
  ref.orderByChild('timestamp').once('value', snapshot => {
    const data = snapshot.val();
    const keys = Object.keys(data);
    
    // Jika jumlah data melebihi 10, hapus data terlama
    if (keys.length > 100) {
      const dataToDelete = keys.slice(0, keys.length - 100);
      
      dataToDelete.forEach(key => {
        ref.child(key).remove()
          .then(() => {
            console.log(`Data dengan kunci ${key} pada ${ref.key} telah dihapus.`);
          })
          .catch(error => {
            console.error(`Gagal menghapus data pada ${ref.key}: ${error}`);
          });
      });
    }
  });
});
}

// Panggil fungsi hapusDataTerlamaPadaSetiapNode saat aplikasi dimulai atau saat diperlukan
hapusDataTerlama();

var keytanamandisalin = ""


function addData(nama_tanaman, min_ph, max_ph, min_lembab, max_lembab, gambarTnm) {
  var newDataRef = database.ref('tanaman').push();
  newDataRef.set({
    nama_tanaman: nama_tanaman,
    min_ph: min_ph,
    max_ph: max_ph,
    nama_tanaman: nama_tanaman,
    min_lembab: min_lembab,
    max_lembab: max_lembab,
    gambarTnm: gambarTnm,
    is_kirim: 0
  });
}

document.getElementById('gambarTnm').addEventListener('change', function(event) {
  var file = event.target.files[0]; // Dapatkan file yang dipilih

  // Periksa apakah ekstensi file valid
  var allowedExtensions = /(\.png|\.jpg|\.jpeg|\.gif)$/i;
  if (!allowedExtensions.exec(file.name)) {
      alert('Format file tidak valid. Format yang diperbolehkan: PNG, JPG, JPEG, GIF');
      event.target.value = ''; // Kosongkan nilai input file
      return false;
  }

  // Periksa apakah ukuran file tidak melebihi 2MB
  if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file melebihi batas maksimum. Maksimum 2MB');
      event.target.value = ''; // Kosongkan nilai input file
      return false;
  }

  var reader = new FileReader(); // Buat objek FileReader

  // Atur event listener untuk memuat gambar ketika selesai dibaca
  reader.onload = function() {
      var previewImage = document.getElementById('previewImage');
      previewImage.src = reader.result; // Atur src elemen gambar dengan data URL gambar yang dipilih
  };

  // Baca file sebagai URL data
  reader.readAsDataURL(file);
});

document.getElementById('data-form').addEventListener('submit', function(event) {
  event.preventDefault();
  var tanamanId = document.getElementById('tanamanId').value;
    if (validateForm()) {
      if (tanamanId) {
          submitEdit(tanamanId);
      } else {
          submitAdd();
      }
  }
});

function validateForm() {
  var nama_tanaman = document.getElementById('nama_tanaman').value;
  var min_ph = document.getElementById('min_ph').value;
  var max_ph = document.getElementById('max_ph').value;
  var min_lembab = document.getElementById('min_lembab').value;
  var max_lembab = document.getElementById('max_lembab').value;

  var namaTanamanRegex = /^[a-zA-Z\s]+$/;
    if (!namaTanamanRegex.test(nama_tanaman)) {
        alert("Nama tanaman harus berupa karakter alfabet.");
        return false;
    }

  if (isNaN(min_ph) || isNaN(max_ph) || isNaN(min_lembab) || isNaN(max_lembab)) {
      alert("Harap masukkan berupa angka untuk pH dan kelembaban.");
      return false;
  }

  min_ph = parseFloat(min_ph);
  max_ph = parseFloat(max_ph);
  min_lembab = parseInt(min_lembab);
  max_lembab = parseInt(max_lembab);

  if (min_ph < 1 || min_ph > 14 || max_ph < 1 || max_ph > 14) {
      alert("Nilai pH harus antara 1 sampai 14");
      return false;
  }

  if (max_ph < min_ph) {
      alert("Max pH tidak bisa lebih kecil dari Min pH.");
      return false;
  }

  if (min_lembab < 10 || min_lembab > 100 || max_lembab < 10 || max_lembab > 100) {
      alert("Nilai kelembaban harus antara 10 sampai 100");
      return false;
  }

  if (max_lembab < min_lembab) {
      alert("Max kelembaban tidak bisa lebih kecil dari Min kelembaban.");
      return false;
  }

  return true;
}

function submitAdd() {
  var nama_tanaman = document.getElementById('nama_tanaman').value.toLowerCase();
  var min_ph = document.getElementById('min_ph').value;
  var max_ph = document.getElementById('max_ph').value;
  var min_lembab = document.getElementById('min_lembab').value;
  var max_lembab = document.getElementById('max_lembab').value;
  var gambarTnm = document.getElementById('gambarTnm').files[0];

  // Menghasilkan angka acak antara 1 dan 10000
  var randomNumber = Math.floor(Math.random() * 10000) + 1;

  // Mendapatkan ekstensi file
  var fileExtension = gambarTnm.name.split('.').pop();

  // Menambahkan angka acak ke nama file sebelum ekstensi file
  var fileNameWithRandomNumber = gambarTnm.name.replace('.' + fileExtension, '') + '_' + randomNumber + '.' + fileExtension;

  // Membuat referensi ke node 'tanaman' di Firebase Realtime Database
  var tanamanRef = database.ref('tanaman');

  // Mengecek apakah nama tanaman sudah tersedia
  tanamanRef.orderByChild('nama_tanaman').equalTo(nama_tanaman).once('value', function(snapshot) {
      if (snapshot.exists()) {
          // Jika nama tanaman sudah ada, tampilkan pesan kesalahan
          alert("Nama tanaman sudah tersedia. Silakan gunakan nama lain.");
      } else {
          // Jika nama tanaman belum ada, lanjutkan proses penambahan data

          // Unggah gambar ke Firebase Storage dengan nama file yang telah dimodifikasi
          var gambarRef = storage.ref().child('gambar/' + fileNameWithRandomNumber);
          gambarRef.put(gambarTnm).then(function(snapshot) {
              // Dapatkan URL gambar setelah diunggah
              snapshot.ref.getDownloadURL().then(function(downloadURL) {
                  // Tambahkan data ke Firebase Realtime Database
                  addData(nama_tanaman, min_ph, max_ph, min_lembab, max_lembab, downloadURL);

                  document.getElementById('previewImage').src = 'assets/img/default.jpg';

                  // Tampilkan pesan berhasil dengan alert
                  alert("Data berhasil disimpan");

                  // Tutup modal
                  $('#exampleModal').modal('hide');

                  // Kosongkan nilai input
                  document.getElementById('nama_tanaman').value = "";
                  document.getElementById('min_ph').value = "";
                  document.getElementById('max_ph').value = "";
                  document.getElementById('min_lembab').value = "";
                  document.getElementById('max_lembab').value = "";
                  document.getElementById('gambarTnm').value = "";

                  // Tampilkan ulang data dalam tabel
                  location.reload();
              });
          });
      }
  });
}

var currentPage = 1;
var itemsPerPage = 10;
var totalPages = 0; // Deklarasikan variabel totalPages di luar fungsi

function simpankey(keyTanaman, namaTanaman, min_lembab, max_lembab, min_ph, max_ph) {
  // Mendapatkan referensi ke tabel 'tb_kirim'
  var dbRef = firebase.database().ref('tb_kirim_baru');
  var minLembabNumber = parseFloat(min_lembab);
  var maxLembabNumber = parseFloat(max_lembab);
  var minPhNumber = parseFloat(min_ph);
  var maxPhNumber = parseFloat(max_ph);

  // Mendapatkan snapshot dari data onoff
  dbRef.once('value').then(function (snapshot) {
    dbRef.update({
      keyTanaman: keyTanaman,
      namaTanaman: namaTanaman,
      min_lembab: minLembabNumber,
      max_lembab: maxLembabNumber,
      min_ph: minPhNumber,
      max_ph: maxPhNumber
    }).then(function () {
      console.log("Data baru berhasil ditambahkan ke tabel 'tb_kirim'.");
    }).catch(function (error) {
      console.error("Error updating value: ", error);
    });
  }).catch(function (error) {
    console.error("Error getting data: ", error);
  });
}

function displayData(currentPage, searchQuery) {
  var dataTable = document.getElementById('tb_data');
  dataTable.innerHTML = '';

  // Hitung indeks awal dan akhir data yang akan ditampilkan
  var startIndex = (currentPage - 1) * itemsPerPage;
  var endIndex = startIndex + itemsPerPage;
  database.ref('tanaman')
    .orderByChild('nama_tanaman')
    .startAt(searchQuery)
    .endAt(searchQuery + '\uf8ff')
    .once('value', function (snapshot) {
      var rowNum = 1;
      snapshot.forEach(function (childSnapshot) {
        if (rowNum > startIndex && rowNum <= endIndex) {
          var childData = childSnapshot.val();
          console.log(childData);
          if (childData.is_kirim == 1) {
            simpankey(childSnapshot.key, childData.nama_tanaman, childData.min_lembab, childData.max_lembab, childData.min_ph, childData.max_ph)
          }
          var classBtnKirim = childData.is_kirim == 1 ? 'btn-danger' : 'btn-success';
          var innerBtnKirim = childData.is_kirim == 1 ? 'Tidak' : 'Kirim';
          var status = childData.is_kirim == 1 ? '<span class="badge bg-success">Aktif</span>' : '<span class="badge bg-warning">Tidak</span>';
          var row = dataTable.insertRow();
          row.innerHTML = '<td>' + rowNum + '</td>' +
            '<td><img src="' + childData.gambarTnm + '" width="100px" height="100px"></td>' +
            '<td>' + childData.nama_tanaman + '</td>' +
            '<td>' + childData.min_ph + '</td>' +
            '<td>' + childData.max_ph + '</td>' +
            '<td>' + childData.min_lembab + '</td>' +
            '<td>' + childData.max_lembab + '</td>' +
            '<td>' + status + '</td>' +
            '<td><button onclick="hapusData(\''+ childSnapshot.key + '\',\'' + childData.gambarTnm+ '\')" class="badge btn-danger m-1">Hapus</button>'+
            '<button id="editButton" onclick="editData(\'' + childSnapshot.key + '\')" class="badge btn-warning m-1" data-bs-toggle="modal" data-bs-target="#exampleModal">Edit</button><br>'+
            '<button onclick="showDetail(\'' + childSnapshot.key + '\')" class="badge btn-primary m-1" data-bs-toggle="modal" data-bs-target="#detailModal">Detail</button>'+
            '<button onclick="kirimDataFirebaseKeESP(\'' + childSnapshot.key + '\')" class="badge ' + classBtnKirim + ' m-1" id="kirimBtn_' + childSnapshot.key + '">' + innerBtnKirim + '</button></td>';
        }
        rowNum++;
      });

      // Update dropdown pageSelect
      updatePageDropdown(currentPage, snapshot.numChildren());
    });
}

// Fungsi untuk memperbarui dropdown halaman
function updatePageDropdown(currentPage, totalItems) {
  totalPages = Math.ceil(totalItems / itemsPerPage); // Update nilai totalPages di sini
  var pageSelect = document.getElementById('pageSelect');
  pageSelect.innerHTML = '';
  for (var i = 1; i <= totalPages; i++) {
    var option = document.createElement('option');
    option.value = i;
    option.text = 'Page ' + i;
    if (i === currentPage) {
      option.selected = true;
    }
    pageSelect.appendChild(option);
  }

  // Update tombol Next dan Previous
  var prevButton = document.getElementById('prevButton');
  var nextButton = document.getElementById('nextButton');
  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

// Fungsi untuk menavigasi ke halaman berikutnya
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    displayData(currentPage);
  }
}

// Fungsi untuk menavigasi ke halaman sebelumnya
function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    displayData(currentPage);
  }
}

window.onload = function () {
  var dbRef = firebase.database().ref('onoff');

  // Mendapatkan snapshot dari data onoff
  dbRef.once('value').then(function (snapshot) {
    var currentVal = snapshot.val().val; // Mendapatkan nilai saat ini
    updateToggleUI(currentVal); // Mengupdate tampilan link dan ikon sesuai dengan nilai saat ini
  }).catch(function (error) {
    console.error("Error getting onoff data: ", error);
  });
  

  // Mendapatkan snapshot dari data onoff
  database.ref('status').once('value').then(function (snapshot) {
    var valStatus = snapshot.val().kondisi; // Mendapatkan nilai saat ini
    updateButtonStatus(valStatus); // Mengupdate tampilan link dan ikon sesuai dengan nilai saat ini
  }).catch(function (error) {
    console.error("Error getting onoff data: ", error);
  });
  
  displayData(currentPage, "");
};


function showDetail(tanamanId) {
  var imageElement = document.getElementById('detailGambar');
  var tableBody = document.querySelector('.modal-body table tbody');

  database.ref('tanaman/' + tanamanId).once('value', function (snapshot) {
    var tnm = snapshot.val();

    // Set image source
    imageElement.src = tnm.gambarTnm;

    // Set table rows
    tableBody.innerHTML = '<tr><th>Nama Tanaman</th><td>' + tnm.nama_tanaman + '</td></tr>' +
      '<tr><th>Min PH</th><td>' + tnm.min_ph + '</td></tr>' +
      '<tr><th>Max PH</th><td>' + tnm.max_ph + '</td></tr>' +
      '<tr><th>Min Lembab</th><td>' + tnm.min_lembab + '</td></tr>' +
      '<tr><th>Max Lembab</th><td>' + tnm.max_lembab + '</td></tr>';
  });
}

function hapusData(tanamanId, gambarUrl) {
  var answer = confirm("Hapus Data..?");
  if (answer) {
    // Hapus data dari Firebase Realtime Database
    database.ref('tanaman/' + tanamanId).remove(function(error) {
      if (!error) {
        // Hapus file gambar dari Firebase Storage
        var storageRef = firebase.storage().refFromURL(gambarUrl);
        storageRef.delete().then(function() {
          // Jika penghapusan berhasil
          alert("Data berhasil dihapus");
          // Refresh halaman
          location.reload();
        }).catch(function(error) {
          // Jika gagal menghapus file gambar
          alert("Gagal menghapus gambar: " + error.message);
        });
      } else {
        // Jika gagal menghapus data dari database
        alert("Gagal menghapus data: " + error.message);
      }
    });
  }
}


function editData(tanamanId) {
  // Mendapatkan data yang akan diedit dari database
  var dataRef = firebase.database().ref('tanaman/' + tanamanId);
  dataRef.once('value', function(snapshot) {
      var data = snapshot.val();
      // Mengisi nilai-nilai input form dengan data yang sudah ada sebelumnya
      document.getElementById('nama_tanaman').value = data.nama_tanaman;
      document.getElementById('min_ph').value = data.min_ph;
      document.getElementById('max_ph').value = data.max_ph;
      document.getElementById('min_lembab').value = data.min_lembab;
      document.getElementById('max_lembab').value = data.max_lembab;
      // Menampilkan gambar yang sudah ada sebelumnya
      document.getElementById('previewImage').src = data.gambarTnm;
      document.getElementById('tanamanId').value = tanamanId;
  });

  // Mengubah teks judul modal
  document.querySelector('.modal-title').innerText = 'Edit Tanaman';

  // Mengubah teks tombol simpan
  document.getElementById('btnSimpan').innerText = 'Update';

  // Menampilkan modal
  $('#exampleModal').modal('show');
}

function submitEdit(tanamanId) {
  var nama_tanaman = document.getElementById('nama_tanaman').value;
  var min_ph = document.getElementById('min_ph').value;
  var max_ph = document.getElementById('max_ph').value;
  var min_lembab = document.getElementById('min_lembab').value;
  var max_lembab = document.getElementById('max_lembab').value;
  var gambarTnm = document.getElementById('gambarTnm').files[0];

  // Membuat variabel flag untuk menandai apakah nama tanaman sudah tersedia selain nama aslinya
  var namaTanamanTersedia = false;

  // Mengecek apakah nama tanaman sudah tersedia selain nama aslinya
  var tanamanRef = firebase.database().ref('tanaman');
  tanamanRef.orderByChild('nama_tanaman').equalTo(nama_tanaman).once('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
          if (childSnapshot.key !== tanamanId) {
              // Jika nama tanaman sudah ada selain nama aslinya, set flag menjadi true dan tampilkan pesan kesalahan
              namaTanamanTersedia = true;
              alert("Nama tanaman sudah tersedia. Silakan gunakan nama lain.");
              location.reload();
              return; // Hentikan iterasi
            }
      });

      // Jika nama tanaman belum ada selain nama aslinya, lanjutkan proses pembaruan data
      if (!namaTanamanTersedia) {
          var data = {
              nama_tanaman: nama_tanaman,
              min_ph: min_ph,
              max_ph: max_ph,
              min_lembab: min_lembab,
              max_lembab: max_lembab
          };

          // Perbarui data di Firebase Realtime Database
          firebase.database().ref('tanaman/' + tanamanId).update(data)
              .then(function() {
                  alert("Data berhasil diperbarui");
                  $('#exampleModal').modal('hide');
                  location.reload(); // Refresh halaman setelah data diperbarui
              })
              .catch(function(error) {
                  console.error("Error updating data: ", error);
              });

          if (gambarTnm) {
              var storageRef = firebase.storage().ref('gambar/' + tanamanId); // Lokasi penyimpanan di Firebase Storage
              
              // Hapus foto lama di storage sebelum mengunggah yang baru
              var deleteTask = storageRef.delete().catch(function(error) {
                  console.error("Error deleting old image: ", error);
              });

              // Unggah gambar baru ke Firebase Storage
              var uploadTask = storageRef.put(gambarTnm);

              uploadTask.on('state_changed',
                  function(snapshot) {
                      // Handle progress
                  },
                  function(error) {
                      // Handle error
                  },
                  function() {
                      // Handle complete
                      uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                          // Perbarui URL gambar di Firebase Realtime Database
                          firebase.database().ref('tanaman/' + tanamanId).update({ gambarTnm: downloadURL });
                          console.log("Updated image URL:", downloadURL);
                          location.reload(); // Refresh halaman setelah gambar diunggah
                      });
                  }
              );
          }
      }
  });
}


// Variabel global untuk menyimpan key yang dikirim sebelumnya dan key row yang diklik terakhir kali
var previousKey = null;
var previousRowKey = null;

function kirimDataFirebaseKeESP(key) {
  // Mendapatkan referensi ke Firebase Realtime Database
  var dbRef = firebase.database().ref('tanaman');

  // Mendapatkan snapshot dari semua data
  dbRef.once('value').then(function (snapshot) {
    // Variabel untuk menentukan apakah data sudah dikirim
    var dataAlreadySent = false;

    // Variabel untuk menyimpan nama tanaman
    var plantName = '';

    // Iterasi melalui setiap entri
    snapshot.forEach(function (childSnapshot) {
      // Jika kunci entri tidak sama dengan kunci yang diberikan
      if (childSnapshot.key !== key) {
        // Set is_kirim menjadi 0
        firebase.database().ref('tanaman/' + childSnapshot.key).update({ is_kirim: 0 });
      } else {
        // Mendapatkan nama tanaman terkait
        plantName = childSnapshot.val().nama_tanaman;

        // Jika is_kirim sudah 1, kembalikan ke 0
        if (childSnapshot.val().is_kirim === 1) {
          firebase.database().ref('tanaman/' + childSnapshot.key).update({ is_kirim: 0 });
          dataAlreadySent = true;
        } else {
          // Jika is_kirim belum 1, set is_kirim menjadi 1
          firebase.database().ref('tanaman/' + childSnapshot.key).update({ is_kirim: 1 })
            .then(function () {
              // Tampilkan pesan dan perbarui halaman setelah berhasil mengirim data
              alert("Tanaman " + plantName + " berhasil dipakai");
              location.reload();
            })
            .catch(function (error) {
              console.error("Error kirim data: ", error);
            });
        }
      }
    });

    // Jika data sudah dikirim, tampilkan pesan
    if (dataAlreadySent) {
      var dbRef = firebase.database().ref('tb_kirim_baru');
      dbRef.remove()
        .then(function() {
          console.log("Node data berhasil dihapus.");
        })
        .catch(function(error) {
          console.error("Error menghapus node data:", error);
        });
      alert("Tanaman " + plantName + " tidak dipakai kembali.");
      location.reload();
    }
  }).catch(function (error) {
    console.error("Error mendapatkan data: ", error);
  });
  // if (previousKey === null || previousKey !== key || previousRowKey !== key) {
  //   // Salin data yang terkait dengan key tersebut ke TB monitoring
  //   salinDataKeMonitoring(key);

  //   // Update previousKey dan previousRowKey dengan key yang baru
  //   previousKey = key;
  //   previousRowKey = key;

  //   let kirimBtn = document.getElementById('kirimBtn_' + key);
  //   kirimBtn.innerText = 'Tidak';
  //   kirimBtn.classList.add('btn-danger');
  //   kirimBtn.classList.remove('btn-success');
  // } else {
  //   // Jika button "Kirim" di row yang sama diklik kembali, hapus data sebelumnya dari TB monitoring
  //   hapusDataMonitoring(key);

  //   // Set previousKey menjadi null karena tidak ada key yang dikirim
  //   previousKey = null;
  // }
}


















































/* function kirimDataFirebaseKeESP(key) {
  // Mendapatkan status tombol "Kirim" dari localStorage
  var isSent = localStorage.getItem('kirimStatus_' + key) === 'true';

  if (!isSent) {
    // Jika tombol "Kirim" belum dikirim sebelumnya, salin data ke TB monitoring
    salinDataKeMonitoring(key);

    // Set status tombol "Kirim" menjadi terkirim di localStorage
    localStorage.setItem('kirimStatus_' + key, 'true');

    // Ubah teks tombol menjadi "Tidak" dan warna latar belakang menjadi merah
    var kirimBtn = document.getElementById('kirimBtn_' + key);
    if (kirimBtn) {
      kirimBtn.innerText = 'Tidak';
      kirimBtn.classList.remove('btn-success');
      kirimBtn.classList.add('btn-danger');
    }
  } else {
    // Jika tombol "Kirim" telah dikirim sebelumnya, hapus data dari TB monitoring
    hapusDataMonitoring(key);

    // Hapus status tombol "Kirim" dari localStorage
    localStorage.removeItem('kirimStatus_' + key);

    // Ubah teks tombol menjadi "Kirim" dan warna latar belakang menjadi hijau
    var kirimBtn = document.getElementById('kirimBtn_' + key);
    if (kirimBtn) {
      kirimBtn.innerText = 'Kirim';
      kirimBtn.classList.remove('btn-danger');
      kirimBtn.classList.add('btn-success');
    }
  }
} */



//var key = 0;
//
//  database.ref("tanaman").orderByKey().limitToLast(1).on('child_added',function(data) {
//   key = parseInt(data.key, 10);
//   key = key + 1;
//  });
//
//  database.ref('tanaman').on('value', function(snapshot) {
//   var count = 0;
//   if(snapshot.exists()){
//    $("#table_list tbody").remove();
//    var content = '<tbody>';
//    snapshot.forEach(function(data) {
//     count+=1;
//     var val = data.val();
//                 content +='<tr>';
//                 content += '<td>' + count + '</td>';
//                 content += '<td>' + val.nama_tanaman + '</td>';
//                 content += '<td>' + val.min_ph + '</td>';
//                 content += '<td>' + val.max_ph + '</td>';
//                 content += '<td>' + val.min_lembab + '</td>';
//                 content += '<td>' + val.max_ph + '</td>';
//                 content += '<td> <button class="btn btn-danger" onclick="hapusData(' + data.key + ')"> Hapus Data </button> <button class="btn btn-primary tampilModalUbah" onclick="setData('+ data.key +')" data-toggle="modal" data-target="#exampleModal">Edit Data</button>  </td>';
//                 content +='</tr>';
//                 key = 0;
//     key = parseInt(data.key, 10);
//     key = key + 1;
//    });
//
//    content += '</tbody>';
//    $('#table_list').append(content);
//   }else{
//    $("#table_list tbody").remove();
//   }
//  });
//
//
//  function tambahData(){
//   if($('#exampleModalLabel').text() == "Tambah Data Baru"){
//    if(key == 0){
//     key = 1;
//    }
//
//    database.ref('tanaman/' + key).set({
//     nama_tanaman: $('#nama_tanaman').val(),
//     min_ph   : $('#min_ph').val(),
//     max_ph : $('#max_ph').val(),
//     min_lembab   : $('#min_lembab').val(),
//     max_lembab : $('#max_lembab').val()
//    });
//
//    alert("Data Berhasil ditambah");
//   }else if($('#exampleModalLabel').text() == "Ubah Data"){
//    database.ref('tanaman/' + $('#tnmId').val()).update({
//        nama_tanaman: $('#nama_tanaman').val(),
//        min_ph   : $('#min_ph').val(),
//        max_ph : $('#max_ph').val(),
//        min_lembab   : $('#min_lembab').val(),
//        max_lembab : $('#max_lembab').val()
//    });
//    alert("Data Berhasil diupdate");
//   }
//  }
//
//
//  function cleardata(){
//   $('#tnmId').val("");
//   $('#nama_tanaman').val("");
//   $('#min_ph').val("");
//   $('#max_ph').val("");
//   $('#min_lembab').val("");
//   $('#max_lembab').val("");
//  }
//
//
//  function setData(id){
//   $('#exampleModalLabel').html('Ubah Data');
//   database.ref('tanaman/').child(id).once('value').then( function(snap) {
//       const tnm = snap.val()
//       $('tnmId').val(id);
//    $('#nama_tanaman').val(tnm.nama_tanaman);
//    $('#min_ph').val(tnm.min_ph);
//    $('#max_ph').val(tnm.max_ph);
//    $('#min_lembab').val(tnm.min_lembab);
//    $('#max_lembab').val(tnm.max_lembab);
//   });
//  }
//
//
//  function hapusData(tnmId){
//   var answer = confirm("Hapus Data..?");
//   if (answer) {
//       database.ref('tanaman/' + id).remove();
//       alert("Data Berhasil dihapus");
//   }
//  }
//
//$('.btnTambahData').on('click', function(){
//        $('#exampleModalLabel').html('Tambah Data Baru');
//    });