import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Dumbbell, Play, Moon, Sun } from 'lucide-react';
import { getTodaysTraining, trainingRules } from '@/data/trainingPlan';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DayPlan = () => {
  const navigate = useNavigate();
  const todaysTraining = getTodaysTraining();
  const today = new Date();
  const dayName = today.toLocaleDateString('pl-PL', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('pl-PL', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Determine greeting based on time
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór';
  const GreetingIcon = hour < 18 ? Sun : Moon;

  if (!todaysTraining) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GreetingIcon className="h-5 w-5 text-yellow-500" />
                  {greeting}!
                </CardTitle>
                <CardDescription className="capitalize">
                  {dayName}, {dateStr}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <div className="h-20 w-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">🧘</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Dzisiaj wolne!</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Dziś jest dzień regeneracji. Możesz odpocząć, zrobić lekki stretching lub spacer.
              </p>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-1">Następny trening</h4>
                  <p className="text-muted-foreground text-sm">
                    {today.getDay() === 0 || today.getDay() === 6 
                      ? 'Poniedziałek - Klatka / Przysiad / Środek Pleców'
                      : today.getDay() === 2 
                        ? 'Środa - Szerokie Plecy / Tył Uda'
                        : today.getDay() === 4
                          ? 'Piątek - Barki / Jednonóż / Detale'
                          : 'Sprawdź plan tygodniowy'
                    }
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-1">Tip dnia</h4>
                  <p className="text-muted-foreground text-sm">
                    Pamiętaj o nawodnieniu i 7-8h snu dla optymalnej regeneracji.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                <Dumbbell className="h-7 w-7" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GreetingIcon className="h-5 w-5 text-yellow-500" />
                  {greeting}! Dziś trening
                </CardTitle>
                <CardDescription className="capitalize">
                  {dayName}, {dateStr}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground px-3 py-1">
              {todaysTraining.dayName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-1">{todaysTraining.focus}</h3>
            <p className="text-muted-foreground text-sm">
              {todaysTraining.exercises.length} ćwiczeń w dzisiejszym treningu
            </p>
          </div>

          {/* Training Rules */}
          <Alert>
            <AlertDescription className="space-y-1 text-sm">
              <p>⚡ {trainingRules.weight}</p>
              <p>⏱️ {trainingRules.restMain}</p>
              <p>🔄 {trainingRules.supersets}</p>
            </AlertDescription>
          </Alert>

          {/* Exercise List Preview */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Dzisiejsze ćwiczenia:</h4>
            <div className="space-y-2">
              {todaysTraining.exercises.map((exercise, index) => (
                <div 
                  key={exercise.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <Badge 
                    variant="secondary" 
                    className="h-8 w-8 rounded-md flex items-center justify-center font-bold shrink-0"
                  >
                    {exercise.isSuperset 
                      ? `${index + 1}${exercise.id.endsWith('a') ? 'a' : 'b'}`
                      : index + 1
                    }
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.sets}</p>
                  </div>
                  {exercise.isSuperset && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Superseria
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Workout Button */}
          <Button 
            size="lg" 
            className="w-full py-6 text-lg"
            onClick={() => navigate(`/workout/${todaysTraining.id}`)}
          >
            <Play className="h-5 w-5 mr-2" />
            Rozpocznij trening
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayPlan;
