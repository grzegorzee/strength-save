import { Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('comp.notFound.message')}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {t('comp.notFound.returnHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
