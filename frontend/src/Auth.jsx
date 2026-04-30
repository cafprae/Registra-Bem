import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle, Package } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const validateEmail = (email) => {
    return email.toLowerCase().endsWith('@ufc.br');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!validateEmail(email)) {
      setError('Apenas e-mails do domínio @ufc.br são permitidos.');
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (!isLogin && !fullName.trim()) {
      setError('Por favor, informe seu nome completo.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              domain: 'ufc.br'
            },
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        setMessage('Cadastro realizado! Verifique seu e-mail institucional para confirmar a conta.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div style={{ maxWidth: '400px', width: '100%', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'linear-gradient(135deg, var(--primary), #7C3AED)', borderRadius: '24px', marginBottom: '20px' }}>
            <Package size={42} color="white" />
          </div>
          <h1 className="header-title" style={{ fontSize: '2.4rem', marginBottom: '8px' }}>Registra Bem</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Controle Patrimonial Integrado - UFC</p>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '1.4rem', textAlign: 'center' }}>
            {isLogin ? 'Bem-vindo de volta' : 'Criar conta institucional'}
          </h2>
          
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="input-label">E-mail @ufc.br</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="text-input" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="seuemail@ufc.br" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            
            {!isLogin && (
              <div className="form-group fade-in">
                <label className="input-label">Nome Completo</label>
                <div style={{ position: 'relative' }}>
                  <Package size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="text-input" 
                    style={{ paddingLeft: '44px' }}
                    placeholder="Seu Nome Completo" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="input-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  className="text-input" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="Sua senha segura" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group fade-in" style={{ marginBottom: '24px' }}>
                <label className="input-label">Confirmar Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    className="text-input" 
                    style={{ paddingLeft: '44px' }}
                    placeholder="Repita sua senha" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{ 
                display: 'flex', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', 
                color: '#F87171', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div style={{ 
                display: 'flex', gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.15)', 
                color: '#34D399', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{message}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '50px' }}>
              {loading ? 'Aguarde...' : isLogin ? (
                <><LogIn size={20} /> Entrar</>
              ) : (
                <><UserPlus size={20} /> Cadastrar</>
              )}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <button 
              type="button"
              className="btn-link" 
              onClick={() => { 
                console.log('Toggling auth mode...');
                setIsLogin(!isLogin); 
                setError(null); 
                setMessage(null); 
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--primary)', 
                cursor: 'pointer', 
                fontSize: '0.95rem', 
                fontWeight: '600',
                textDecoration: 'none',
                padding: '8px 16px',
                width: '100%',
                display: 'block'
              }}
            >
              {isLogin ? 'Não possui conta? Registre-se aqui' : 'Já possui conta? Faça o login'}
            </button>
          </div>
        </div>
        
        {!isLogin && (
          <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', lineHeight: '1.5' }}>
            Após o cadastro, o acesso às funcionalidades de edição será liberado manualmente apenas para agentes de patrimônio e gestores autorizados.
          </p>
        )}
      </div>
    </div>
  );
}
