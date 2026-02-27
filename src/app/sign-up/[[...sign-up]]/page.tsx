import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50"
      style={{ 
        paddingLeft: '1rem', 
        paddingRight: '1rem',
        paddingTop: '1rem',
        paddingBottom: '1rem'
      }}
    >
      <SignUp 
        appearance={{
          variables: {
            colorPrimary: '#ea580c',
            colorTextOnPrimaryBackground: '#ffffff',
            colorBackground: '#ffffff',
            colorInputBackground: '#ffffff',
            colorInputText: '#1f2937',
          },
          elements: {
            rootBox: {
              width: '100%',
              maxWidth: '320px',
            },
            card: {
              width: '100%',
              maxWidth: '320px',
              margin: '0 auto',
            },
            formButtonPrimary: {
              backgroundColor: '#ea580c',
            },
            footerActionLink: {
              color: '#ea580c',
            },
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
