// Skrypt do aktualizacji dzisiejszego treningu w Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

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

// Dane z treningu ze zdjęć
const exercisesData = [
  {
    exerciseId: "ex-1-1", // Wyciskanie hantli (Lekki skos)
    sets: [
      { reps: 6, weight: 45, completed: true },
      { reps: 5, weight: 45, completed: true },
      { reps: 5, weight: 45, completed: true }
    ]
  },
  {
    exerciseId: "ex-1-2", // Przysiad ze sztangą (High Bar)
    sets: [
      { reps: 6, weight: 70, completed: true },
      { reps: 6, weight: 70, completed: true },
      { reps: 7, weight: 75, completed: true }
    ]
  },
  {
    exerciseId: "ex-1-3", // Wiosłowanie hantlami na ławce (przodem)
    sets: [
      { reps: 8, weight: 40, completed: true },
      { reps: 8, weight: 40, completed: true },
      { reps: 7, weight: 45, completed: true }
    ]
  },
  {
    exerciseId: "ex-1-4", // Uginanie nóg na maszynie (Siedząc)
    sets: [
      { reps: 8, weight: 57, completed: true },
      { reps: 8, weight: 57, completed: true },
      { reps: 8, weight: 57, completed: true }
    ]
  },
  {
    exerciseId: "ex-1-5a", // Uginanie hantli z supinacją (Ławka skośna)
    sets: [
      { reps: 6, weight: 28, completed: true },
      { reps: 6, weight: 24, completed: true },
      { reps: 6, weight: 24, completed: true }
    ]
  },
  {
    exerciseId: "ex-1-5b", // Wyprosty francuskie zza głowy
    sets: [
      { reps: 12, weight: 10, completed: true },
      { reps: 10, weight: 14, completed: true },
      { reps: 10, weight: 14, completed: true }
    ]
  }
];

async function updateTodaysWorkout() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Szukam treningu dla daty:', today, 'i dayId: day-1');

  // Pobierz wszystkie workouty
  const workoutsRef = collection(db, 'workouts');
  const snapshot = await getDocs(workoutsRef);

  let foundWorkout = null;
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    console.log('Znaleziono workout:', docSnap.id, 'date:', data.date, 'dayId:', data.dayId);
    if (data.date === today && data.dayId === 'day-1') {
      foundWorkout = { id: docSnap.id, ...data };
    }
  });

  if (!foundWorkout) {
    console.log('Nie znaleziono dzisiejszego treningu dla day-1');
    console.log('Dostępne workouty:');
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      console.log(`  - ${docSnap.id}: date=${data.date}, dayId=${data.dayId}, completed=${data.completed}`);
    });
    process.exit(1);
  }

  console.log('Znaleziono workout:', foundWorkout.id);
  console.log('Aktualne exercises:', JSON.stringify(foundWorkout.exercises, null, 2));

  // Aktualizuj workout
  const workoutRef = doc(db, 'workouts', foundWorkout.id);
  await updateDoc(workoutRef, {
    exercises: exercisesData
  });

  console.log('Zaktualizowano workout pomyślnie!');
  console.log('Nowe exercises:', JSON.stringify(exercisesData, null, 2));

  // Policz tonaż
  let totalWeight = 0;
  let totalSets = 0;
  exercisesData.forEach(ex => {
    ex.sets.forEach(set => {
      if (set.completed) {
        totalWeight += set.reps * set.weight;
        totalSets++;
      }
    });
  });

  console.log('\n--- PODSUMOWANIE ---');
  console.log('Ćwiczeń:', exercisesData.length);
  console.log('Serii ukończonych:', totalSets);
  console.log('Całkowity tonaż:', totalWeight, 'kg');
}

updateTodaysWorkout()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Błąd:', err);
    process.exit(1);
  });
