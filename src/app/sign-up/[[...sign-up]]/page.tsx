import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="w-full max-w-[400px]">
        <SignUp 
          appearance={{
            elements: {
              rootBox: {
                width: '100%',
              },
              card: {
                width: '100%',
                boxShadow: 'none',
                border: '1px solid #e5e7eb',
              }
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
        />
      </div>
    </div>
  );
}
