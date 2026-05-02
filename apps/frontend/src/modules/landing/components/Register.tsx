// TO JEST DO USUNIECIA - TESTOWO ZROBILAM BO EDYTOWALAM INPUT POD KOLORY DARK THEME //

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Link } from '@tanstack/react-router';

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Czyścimy błąd danego pola, gdy użytkownik zaczyna pisać
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Przykładowa walidacja
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'Imię jest wymagane';
    if (!formData.lastName) newErrors.lastName = 'Nazwisko jest wymagane';
    if (!formData.email.includes('@')) newErrors.email = 'Niepoprawny email';
    if (formData.password.length < 8) newErrors.password = 'Hasło jest za krótkie';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Rejestracja...', formData);
  };

  return (
    <div className="min-h-screen bg-bg-section  flex items-center justify-center p-4 transition-colors duration-500">
      <div className="bg-white dark:bg-bg-card w-full max-w-[450px] p-8 rounded-[24px] shadow-card border border-transparent dark:border-white/5 flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            {/* Tutaj wstaw swoje logo SVG */}
            <span className="text-2xl font-bold text-[#002B7F] dark:text-white">AutoKeep</span>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 dark:text-white mb-2">
            Założ darmowe konto
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Wypróbuj bezpłatnie przez 7 dni
          </p>
        </div>

        {/* Formularz */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <Input
            label="Imię"
            name="firstName"
            placeholder="Imię"
            value={formData.firstName}
            onChange={handleChange('firstName')}
            error={errors.firstName}
          />

          <Input
            label="Nazwisko"
            name="lastName"
            placeholder="Nazwisko"
            value={formData.lastName}
            onChange={handleChange('lastName')}
            error={errors.lastName}
          />

          <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="mail@example.com"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
          />

          <Input
            label="Hasło"
            name="password"
            type="password"
            placeholder="Hasło (min 8 znaków)"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
          />

          <Button variant="default" type="submit" className="w-full">
            ZAŁÓŻ KONTO
          </Button>
        </form>

        {/* Footer formularza */}
        <p className="mt-6 text-sm font-medium text-gray-600 dark:text-gray-400">
          Masz juz konto ?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
};
