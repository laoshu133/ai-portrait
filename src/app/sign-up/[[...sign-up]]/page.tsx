import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
      <SignUp 
        appearance={{
          elements: {
            rootBox: {
              width: '100%',
              maxWidth: '400px',
            }
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        redirectUrl="/"
      />
    </div>
  );
}
