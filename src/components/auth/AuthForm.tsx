import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Camera } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface AuthFormProps {
  onSignIn: (email: string, password: string) => Promise<{ error: any }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  onResetPassword: (email: string) => Promise<{ error: any }>;
}

export function AuthForm({ onSignIn, onSignUp, onResetPassword }: AuthFormProps) {
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (mode === 'forgotPassword') {
        result = await onResetPassword(email);
        if (!result.error) {
          toast({
            title: 'Check your email',
            description: 'We sent you a password reset link.',
          });
          setMode('signIn');
          setLoading(false);
          return;
        }
      } else if (mode === 'signUp') {
        result = await onSignUp(email, password, fullName);
      } else {
        result = await onSignIn(email, password);
      }

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
      } else if (mode === 'signUp') {
        toast({
          title: 'Account created',
          description: 'Please check your email to verify your account.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'forgotPassword'
    ? 'Reset Password'
    : 'Citywire Studios Inventory';

  const description = mode === 'forgotPassword'
    ? "Enter your email and we'll send you a reset link"
    : mode === 'signUp'
      ? 'Create an account to get started'
      : 'Sign in to access the inventory system';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#4EB5E8] rounded-lg flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signUp' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@citywire.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== 'forgotPassword' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Loading...'
                : mode === 'forgotPassword'
                  ? 'Send Reset Link'
                  : mode === 'signUp'
                    ? 'Sign Up'
                    : 'Sign In'}
            </Button>
          </form>

          {mode === 'signIn' && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setMode('forgotPassword')}
                className="text-sm text-muted-foreground hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            {mode === 'forgotPassword' ? (
              <button
                type="button"
                onClick={() => setMode('signIn')}
                className="text-sm text-[#4EB5E8] hover:underline"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}
                className="text-sm text-[#4EB5E8] hover:underline"
              >
                {mode === 'signUp' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
