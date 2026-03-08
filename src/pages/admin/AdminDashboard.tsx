import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Settings, Dumbbell } from 'lucide-react';
import type { UserProfile } from '@/contexts/UserContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          usersData.push({
            uid: doc.id,
            email: data.email || '',
            displayName: data.displayName || '',
            role: data.role || 'user',
            stravaConnected: data.stravaConnected || false,
          });
        });
        setUsers(usersData);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Panel admina</h1>
          <p className="text-muted-foreground text-sm">Zarządzaj użytkownikami i planami</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Użytkownicy ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div
              key={user.uid}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {user.displayName
                    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                    : '?'}
                </div>
                <div>
                  <p className="font-medium">{user.displayName || 'Bez nazwy'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/plans/${user.uid}`)}
                >
                  <Dumbbell className="h-4 w-4 mr-1" />
                  Plan
                </Button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak zarejestrowanych użytkowników
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
