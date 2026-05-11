import { Accordion } from '@/features/homepage/widgets/Accordion';
import { useState } from 'react';

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData = [
    {
      id: 1,
      question: 'Czy AutoKeep jest darmowy?',
      answer:
        'Tak! Możesz zacząć korzystać z AutoKeep całkowicie bezpłatnie w ramach 7-dniowego okresu próbnego. Daje on pełny dostęp do wszystkich funkcji systemu, dzięki czemu możesz przetestować, jak aplikacja ułatwi Ci zarządzanie pojazdami przed podjęciem decyzji o subskrypcji.',
    },
    {
      id: 2,
      question: 'Co się stanie po zakończeniu 7-dniowego okresu próbnego?',
      answer:
        'Po zakończeniu okresu próbnego poprosimy Cię o wybór jednego z naszych planów subskrypcyjnych. Jeśli nie zdecydujesz się na zakup, Twoje konto przejdzie w tryb odczytu – dane pozostaną bezpieczne, ale dodawanie nowych wpisów zostanie zablokowane do czasu aktywacji planu.',
    },
    {
      id: 3,
      question: 'Jakie typy pojazdów mogę monitorować?',
      answer:
        'AutoKeep jest uniwersalny. Możesz zarządzać samochodami osobowymi, dostawczymi, motocyklami, a nawet flotą pojazdów ciężarowych. Dla każdego typu pojazdu możesz ustawić indywidualne parametry serwisowe i przypomnienia.',
    },
    {
      id: 4,
      question: 'Jak działają przypomnienia?',
      answer:
        'System automatycznie analizuje daty ważności Twoich dokumentów (ubezpieczenie, przegląd) oraz przebieg pojazdu. Powiadomienia otrzymasz drogą mailową lub bezpośrednio w aplikacji z odpowiednim wyprzedzeniem, abyś nigdy nie przegapił ważnego terminu.',
    },
    {
      id: 5,
      question: 'Czy moje dane są bezpieczne?',
      answer:
        'Bezpieczeństwo to nasz priorytet. Wszystkie dane są szyfrowane i przechowywane na zabezpieczonych serwerach z regularnymi kopiami zapasowymi. Nigdy nie udostępniamy Twoich danych podmiotom trzecim bez Twojej wyraźnej zgody.',
    },
    {
      id: 6,
      question: 'Czy mogę zarządzać więcej niż jednym pojazdem?',
      answer:
        'Oczywiście! W zależności od wybranego planu, możesz dodać od jednego do nawet kilkunastu pojazdów w ramach jednego konta. Przełączanie się między garażami jest szybkie i intuicyjne.',
    },
    {
      id: 7,
      question: 'Czy mogę wyeksportować historię serwisową?',
      answer:
        'Tak, AutoKeep umożliwia wygenerowanie pełnego raportu historii serwisowej do pliku PDF lub CSV. Jest to szczególnie przydatne podczas sprzedaży pojazdu, aby udokumentować dbałość o stan techniczny przed potencjalnym nabywcą.',
    },
  ];

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="scroll-mt-20 mb-[70px] lg:mb-30">
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 relative z-10 max-w-[1440px]">
        <div className="lg:text-center max-w-[700px] mx-auto ">
          <h2 className="mb-[50px] ">
            Najczęsciej zadawane <span className="text-primary">pytania</span>
          </h2>
        </div>
        <div className="w-full max-w-[760px] space-y-4 mx-auto">
          {faqData.map((item, index) => (
            <Accordion
              key={item.id}
              title={item.question}
              isOpen={openIndex === index}
              onClick={() => handleToggle(index)}
            >
              {item.answer}
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
};
