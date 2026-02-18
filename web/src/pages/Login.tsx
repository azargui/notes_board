import { Mail, Lock, LogIn, StickyNote } from 'lucide-react';
import Input from '../components/Input'; // Check this path is correct for your folder structure
import Button from '../components/Button'; // Check this path is correct

const LoginPage = () => {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon-circle">
                        <StickyNote size={28} color="#fff" />
                    </div>
                    <h2 className="auth-title">Welcome Back</h2>
                    <p className="auth-subtitle">Login to access your workspace</p>
                </div>

                <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <Input 
                        label="Email Address"
                        placeholder="user@example.com"
                        type="email"
                        icon={<Mail size={18} />}
                    />
                    <div>
                        <Input 
                            label="Password"
                            placeholder="••••••••"
                            type="password"
                            icon={<Lock size={18} />}
                        />
                        <div style={{ textAlign: 'right', marginTop: '8px' }}>
                            <a href="#" className="auth-link" style={{ fontSize: '0.8rem' }}>Forgot Password?</a>
                        </div>
                    </div>
                    <Button 
                        label="Sign In"
                        type="submit" 
                        icon={<LogIn size={18} />} 
                    />
                </form>

                <div className="divider"><span>Or</span></div>

                <div className="auth-footer">
                    {/* Use proper React Router Link if possible, otherwise normal a tag is okay */}
                    Don't have an account? <a href="/register" className="auth-link">Create Account</a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage; // <--- THIS IS CRITICAL