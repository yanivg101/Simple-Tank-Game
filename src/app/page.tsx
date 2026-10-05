import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>SimpleWebApp</h1>
      <p style={{ color: '#888', marginBottom: '40px' }}>Welcome to the game hub</p>
      <Link 
        href="/game"
        style={{
          display: 'inline-block',
          padding: '15px 40px',
          fontSize: '18px',
          background: 'linear-gradient(135deg, #4CAF50, #2196F3)',
          borderRadius: '12px',
          color: 'white',
          textDecoration: 'none',
        }}
      >
        Play Tank Battle
      </Link>
    </main>
  );
}
