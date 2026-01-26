// Skrypt diagnostyczny - sprawdza co jest w Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCeOk53XZs0yFpwpxx505YiP305Z1szjus",
  authDomain: "fittracker-workouts.firebaseapp.com",
  projectId: "fittracker-workouts",
  storageBucket: "fittracker-workouts.firebasestorage.app",
  messagingSenderId: "283539506094",
  appId: "1:283539506094:web:fcb9e5af60d71fd566be3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugWorkouts() {
  console.log('=== DIAGNOZA WORKOUTÓW W FIREBASE ===\n');

  // Dzisiejsza data
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  console.log('Dzisiejsza data (lokalna):', todayStr);
  console.log('Dzisiejsza data (ISO):', today.toISOString().split('T')[0]);
  console.log('');

  // Pobierz wszystkie workouty
  const workoutsRef = collection(db, 'workouts');
  const snapshot = await getDocs(workoutsRef);

  console.log('Wszystkie workouty w Firebase:');
  console.log('-------------------------------');

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    console.log(`ID: ${docSnap.id}`);
    console.log(`  dayId: ${data.dayId}`);
    console.log(`  date: ${data.date}`);
    console.log(`  completed: ${data.completed}`);
    console.log(`  exercises: ${data.exercises?.length || 0} ćwiczeń`);

    // Sprawdź czy to dzisiejszy workout
    if (data.date === todayStr) {
      console.log(`  >>> TO JEST DZISIEJSZY WORKOUT <<<`);
    }
    console.log('');
  });

  // Sprawdź schedule
  console.log('\n=== SCHEDULE (pierwsze 3 dni) ===');
  const start = new Date();
  const dayOfWeek = start.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  start.setDate(start.getDate() + daysUntilMonday);
  start.setHours(0, 0, 0, 0);

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const monday = new Date(start);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  console.log('Poniedziałek:', formatLocalDate(monday), '(day-1)');
  console.log('Środa:', formatLocalDate(wednesday), '(day-2)');
  console.log('Piątek:', formatLocalDate(friday), '(day-3)');
}

debugWorkouts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Błąd:', err);
    process.exit(1);
  });
