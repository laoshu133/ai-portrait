import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="w-full max-w-sm">
        <SignIn 
          appearance={{
            variables: {
              colorPrimary: '#ea580c',
              colorTextOnPrimaryBackground: '#ffffff',
              colorBackground: '#ffffff',
              colorInputBackground: '#ffffff',
              colorInputText: '#1f2937',
              borderRadius: '0.75rem',
            },
            elements: {
              rootBox: {
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              },
              card: {
                width: '100%',
                maxWidth: '360px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                borderRadius: '0.75rem',
              },
              formButtonPrimary: {
                backgroundColor: '#ea580c',
                borderRadius: '0.5rem',
              },
              footerActionLink: {
                color: '#ea580c',
              },
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
