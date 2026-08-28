import { Navigate } from 'react-router-dom';

// A5 (X70): zakładka w nawigacji nazywa się "Postępy" (id: progress), a jej
// kanoniczny URL to /achievements. Deep link /progress przekierowujemy na stałe,
// żeby intuicyjny adres nie kończył się na NotFound.
export const ProgressRedirect = () => <Navigate to="/achievements" replace />;
