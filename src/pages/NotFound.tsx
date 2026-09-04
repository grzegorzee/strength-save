import { Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('comp.notFound.message')}</p>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-lg px-3 text-primary underline hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t('comp.notFound.returnHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
