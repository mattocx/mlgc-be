import { Firestore } from '@google-cloud/firestore';
import fs from 'fs';
import path from 'path';

// Fungsi pencatatan kesalahan yang lebih informatif
function logError(message, error) {
  console.error(`[🔴 Kesalahan Firestore] ${message}`, {
    errorMessage: error.message,
    errorCode: error.code,
    errorStack: error.stack
  });
}

// Fungsi diagnostik untuk pemeriksaan berkas kunci
function validateServiceAccountKey(keyFilePath) {
  try {
    // Periksa keberadaan berkas
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Berkas kunci akun layanan TIDAK DITEMUKAN: ${keyFilePath}`);
    }

    // Baca dan parsing berkas JSON
    const keyFileContent = fs.readFileSync(keyFilePath, 'utf8');
    const keyData = JSON.parse(keyFileContent);

    // Validasi struktur kunci
    if (!keyData.project_id || !keyData.client_email) {
      throw new Error('Struktur berkas kunci tidak valid');
    }

    console.log('✅ Berkas kunci akun layanan valid', {
      projectId: keyData.project_id,
      serviceAccountEmail: keyData.client_email
    });

    return keyData;
  } catch (error) {
    logError('Kesalahan validasi berkas kunci', error);
    throw error;
  }
}

// Fungsi inisialisasi Firestore dengan penanganan kesalahan komprehensif
function initializeFirestore() {
  try {
    // Gunakan jalur relatif dari root proyek
    const keyFilePath = path.resolve('./submissionmlgc-elsa.json');
    
    // Validasi berkas kunci
    const keyData = validateServiceAccountKey(keyFilePath);

    // Inisialisasi Firestore dengan konfigurasi aman
    const db = new Firestore({
      keyFilename: keyFilePath,
      projectId: keyData.project_id,
      host: 'firestore.googleapis.com',
      ssl: true
    });

    console.log('🟢 Koneksi Firestore berhasil diinisialisasi');
    return db;
  } catch (initError) {
    logError('Gagal menginisialisasi Firestore', initError);
    
    // Keluarkan pesan kesalahan terperinci
    console.error(`
      ❌ Inisialisasi Firestore Gagal
      ---------------------------
      Kemungkinan Penyebab:
      - Berkas kunci tidak ditemukan
      - Konfigurasi proyek salah
      - Masalah izin akses
    `);

    // Biarkan aplikasi memutuskan cara menangani kesalahan
    throw initError;
  }
}

// Inisialisasi database di luar fungsi untuk menghindari pembuatan berulang
let db;
try {
  db = initializeFirestore();
} catch (error) {
  console.error('Tidak dapat membuat instance Firestore', error);
  // Opsional: Gunakan mekanisme fallback atau log tambahan
}

const predictionsCollection = db ? db.collection('predictions') : null;

// Fungsi penyimpanan data dengan validasi tambahan
async function storeData(id, data) {
  if (!db) {
    throw new Error('Koneksi Firestore tidak tersedia');
  }

  try {
    // Validasi input
    if (!id || typeof id !== 'string') {
      throw new Error('ID dokumen tidak valid');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Objek data tidak valid');
    }

    const predictCollection = db.collection('predictions');
    
    // Tambahkan timestamp server
    const dataWithTimestamp = { 
      ...data, 
      createdAt: Firestore.FieldValue.serverTimestamp() 
    };

    // Log diagnostik
    console.log('📝 Mencoba menyimpan data:', { 
      id, 
      dataKeys: Object.keys(data) 
    });
    
    // Simpan dokumen
    await predictCollection.doc(id).set(dataWithTimestamp);
    
    console.log(`✅ Data berhasil ditulis untuk ID: ${id}`);
    
    return { 
      success: true, 
      message: 'Penyimpanan data berhasil',
      id: id
    };

  } catch (error) {
    logError('Kesalahan penyimpanan data', error);
    
    // Detail kesalahan tambahan
    return { 
      success: false, 
      error: error.message,
      errorCode: error.code,
      details: error.toString()
    };
  }
}

export { predictionsCollection, storeData };