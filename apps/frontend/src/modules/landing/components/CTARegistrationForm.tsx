import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Link } from '@tanstack/react-router';

export const CTARegistrationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    console.log('Dane wysłane:', formData);
  };

  const inputTheme =
    '!bg-secondary !border-none text-white placeholder:text-white/70 !min-h-[45px] !rounded-[7px]';

  return (
    <div className="bg-primary/70 backdrop-blur-md rounded-[15px] px-6 py-8 text-white w-full ">
      <div className="text-center mb-8">
        <h4 className="text-[18px] mb-2 text-white">Załóż darmowe konto</h4>
        <p className="opacity-90 text-white">Wypróbuj bezpłatnie przez 7 dni</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          name="firstName"
          placeholder="Imię"
          value={formData.firstName}
          onChange={(val) => handleChange('firstName', val)}
          className={inputTheme}
        />
        <Input
          name="lastName"
          placeholder="Nazwisko"
          value={formData.lastName}
          onChange={(val) => handleChange('lastName', val)}
          className={inputTheme}
        />
        <Input
          name="email"
          type="email"
          placeholder="Adres e-mail"
          value={formData.email}
          onChange={(val) => handleChange('email', val)}
          className={inputTheme}
        />
        <Input
          name="password"
          type="password"
          placeholder="Hasło (min 8 znaków)"
          value={formData.password}
          onChange={(val) => handleChange('password', val)}
          className={inputTheme}
        />
        <Link to="/">
          <Button variant="outline" type="submit" className="w-full mt-2 mb-2">
            Zarejestruj się za darmo
          </Button>
        </Link>
        <p className="text-center text-[12px] text-white opacity-90">
          Karta płatnicza nie jest wymagana. Rejestracja bez ryzyka.
        </p>
      </form>
    </div>
  );
};
