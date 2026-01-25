import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { trainingPlan } from '@/data/trainingPlan';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import { useState } from 'react';
import { pl } from 'date-fns/locale';

const TrainingPlan = () => {
  const navigate = useNavigate();
  const { getLatestWorkout, workouts } = useWorkoutProgress();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get dates with completed workouts
  const completedDates = workouts
    .filter(w => w.completed)
    .map(w => new Date(w.date));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan treningowy</CardTitle>
          <CardDescription>Poniżej znajduje się lista ćwiczeń na najbliższy tydzień</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Training Days List */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground py-2 px-4 text-sm">
                  {new Date().toLocaleDateString('pl-PL', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })} - {new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </Badge>
              </div>

              <div className="space-y-3">
                {trainingPlan.map((day) => (
                  <TrainingDayCard
                    key={day.id}
                    day={day}
                    latestWorkout={getLatestWorkout(day.id)}
                    onClick={() => navigate(`/workout/${day.id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="hidden lg:block">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={pl}
                modifiers={{
                  completed: completedDates,
                }}
                modifiersStyles={{
                  completed: {
                    backgroundColor: 'hsl(var(--fitness-success))',
                    color: 'white',
                    borderRadius: '50%',
                  },
                }}
                className="rounded-xl border p-3"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPlan;
