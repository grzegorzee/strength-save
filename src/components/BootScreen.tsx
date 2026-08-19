import appIcon from '@/assets/app-icon.png';

export const BootScreen = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background">
    <img
      src={appIcon}
      alt="Strength Save"
      className="h-16 w-16 rounded-2xl"
    />
    <div
      role="progressbar"
      aria-label="Strength Save"
      aria-valuetext="Loading"
      className="h-0.5 w-24 overflow-hidden rounded-full bg-muted"
    >
      <div className="boot-progress-indicator h-full w-1/3 rounded-full bg-primary" />
    </div>
  </div>
);
