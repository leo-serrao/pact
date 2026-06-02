#!/usr/bin/env node
import dotenv from 'dotenv'
import fs from 'fs'

// prefer .env.local if present, otherwise .env
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env'
const res = dotenv.config({ path: envPath })
if (res.error) {
  console.warn('No env file loaded from', envPath)
} else {
  console.log('Loaded env from', envPath)
}

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
]

const missing = required.filter(k => !process.env[k])
if (missing.length) {
  console.error('Missing environment variables:', missing.join(', '))
  console.error('Create a `.env.local` with the values or export them in your shell.')
  process.exit(1)
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
}

try {
  const { initializeApp } = await import('firebase/app')
  const app = initializeApp(firebaseConfig)
  console.log('Firebase initialized with projectId=', app?.options?.projectId || '(unknown)')
  // attempt to import firestore and check availability (this will only confirm SDK init)
  try {
    const { getFirestore } = await import('firebase/firestore')
    const db = getFirestore(app)
    console.log('Firestore SDK initialized. You can now run the app and test reads/writes in the console.')
  } catch (e) {
    console.warn('Firestore SDK import failed (SDK may be missing):', e.message || e)
  }
  console.log('Done. If you want an authenticated read/write test, sign in via the app or extend this script to use admin credentials.')
} catch (err) {
  console.error('Failed to initialize Firebase SDK:', err)
  process.exit(2)
}
