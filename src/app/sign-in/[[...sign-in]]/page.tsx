import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="w-full max-w-[400px]">
        <SignIn 
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
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/"
        />
      </div>
    </div>
  );
}
