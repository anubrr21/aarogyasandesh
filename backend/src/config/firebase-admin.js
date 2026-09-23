import admin from 'firebase-admin';

let serviceAccount;

try {
  const serviceAccountPath = new URL('../../serviceAccountKey.json', import.meta.url);
  const serviceAccountFile = await import('fs').then(fs => 
    fs.readFileSync(serviceAccountPath, 'utf8')
  );
  serviceAccount = JSON.parse(serviceAccountFile);
} catch (error) {
  console.warn('Service account file not found, using environment variables');
  serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };
}

if (!admin.apps || admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      
      projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

export { serviceAccount };
export default admin;