# VetCare — Veterinarijos klinikos valdymo sistema

## Aprašymas

VetCare - vidinė veterinarijos klinikos valdymo sistema, skirta mažoms ir vidutinėms veterinarijos klinikoms. Sistema leidžia:
- Registruoti gyvūnus, jų savininkus ir veterinarus
- Kurti vizitus su paslaugomis ir diagnozėmis
- Valdyti registracijas su kalendoriumi ir laiko slotais (09:00–17:00, kas 1 val.)
- Peržiūrėti gydymo istoriją
- Atlikti paiešką, filtravimą ir rūšiavimą
- Apsaugoti prieigą per administratoriaus prisijungimą (bcrypt + JWT)

## Technologijos

| Technologija            | Paskirtis                          |
|-------------------------|------------------------------------|
| Next.js 14 (App Router) | Full-stack web karkasas            |
| React 18 + Tailwind CSS | Naudotojo sąsaja                   |
| Supabase (PostgreSQL)   | Duomenų bazė debesyje              |
| Prisma ORM              | DB modeliai, migracijos, užklausos |
| bcrypt + JWT            | Autentifikacija                    |
| Jest + Testing Library  | Testavimas (91%+ coverage)         |
| Git + GitHub            | Versijų kontrolė                   |

## Reikalavimai

- Node.js - 18.x arba naujesnė versija
- npm - 9.x arba naujesnė versija
- PostgreSQL duomenų bazė (rekomenduojama [Supabase](https://supabase.com/))

## Diegimas

# 1. Klonuoti repozitoriją
git clone https://github.com/Axellu5/vetcare.git
cd vetcare

# 2. Įdiegti priklausomybes
npm install

# 3. Sukonfigūruoti aplinkos kintamuosius
cp .env.example .env
# Redaguoti .env - įrašyti DATABASE_URL ir JWT_SECRET

# 4. Paleisti Prisma migraciją ir užpildyti pradinius duomenis
npx prisma migrate deploy
npx prisma db seed

# 5. Paleisti kūrimo serverį
npm run dev

Sistema bus pasiekiama adresu: 'http://localhost:3000'

### Prisijungimo duomenys

| El. paštas         | Slaptažodis | Rolė    |
|--------------------|-------------|---------|
| admin@vetcare.lt   | admin123    | admin   |
| manager@vetcare.lt | admin123    | manager |

## Paleidimo komandos

npm run dev            # Paleisti kūrimo serverį (http://localhost:3000)
npm run build          # Sukompiliuoti produkcinę versiją
npm start              # Paleisti produkcinį serverį
npm test               # Paleisti visus testus
npm run test:coverage  # Paleisti testus su padengimo ataskaita
npm run test:watch     # Paleisti testus stebėjimo režimu
npm run lint           # Patikrinti kodo kokybę (ESLint)


## Projekto struktūra

vetcare/
├── app/                          # Next.js App Router puslapiai ir API
│   ├── api/                      # REST API maršrutai
│   │   ├── auth/                 #   Autentifikacija (login, me)
│   │   ├── appointments/         #   Registracijų CRUD + availability
│   │   ├── owners/               #   Savininkų CRUD
│   │   ├── pets/                 #   Gyvūnų CRUD
│   │   ├── services/             #   Paslaugų sąrašas
│   │   ├── vets/                 #   Veterinarų CRUD
│   │   ├── visits/               #   Vizitų CRUD
│   │   └── reports/              #   Ataskaitos (4 endpointai)
│   ├── appointments/             #   Kalendoriaus puslapis
│   ├── owners/                   #   Savininkų puslapis
│   ├── pets/                     #   Gyvūnų puslapis + detalės
│   ├── vets/                     #   Veterinarų puslapis
│   ├── visits/                   #   Vizitų puslapis + detalės
│   ├── login/                    #   Prisijungimo puslapis
│   ├── components/               #   Layout (AppShell)
│   ├── layout.js                 #   Pagrindinis layout
│   └── page.js                   #   Dashboard
├── components/                   # React komponentai
│   ├── forms/                    #   Modalinės formos (5 failai)
│   ├── tables/                   #   Duomenų lentelės (3 failai)
│   └── ui/                       #   UI elementai (Sidebar, Header, TimeSlotGrid)
├── lib/                          # Verslo logika ir utilai
│   ├── auth.js                   #   Slaptažodžių heširavimas + JWT
│   ├── authContext.js            #   React autentifikacijos kontekstas
│   ├── prisma.js                 #   Singleton — DB klientas
│   ├── middleware/               #   JWT autentifikacijos middleware
│   ├── patterns/                 #   7 projektavimo šablonai
│   │   ├── responseFactory.js    #     Factory Method
│   │   ├── adapter.js            #     Adapter
│   │   ├── facade.js             #     Facade
│   │   ├── strategy.js           #     Strategy
│   │   ├── observer.js           #     Observer
│   │   └── templateMethod.js     #     Template Method
│   └── utils/                    #   Paieškos ir filtravimo algoritmai
│       ├── search.js             #     Multi-field OR paieška
│       └── filter.js             #     Multi-condition AND filtras
├── prisma/
│   ├── schema.prisma             #   8 lentelių DB schema
│   ├── seed.js                   #   Pradiniai duomenys
│   └── migrations/               #   DB migracijos
├── __tests__/                    # Testai (13 failų, 336 testai)
│   ├── unit/
│   │   ├── patterns/             #   Šablonų testai (6 failai)
│   │   ├── utils/                #   Utilų testai (3 failai)
│   │   ├── auth.test.js          #   Autentifikacijos testai
│   │   ├── exceptions.test.js    #   Išimčių testai
│   │   └── parameterized.test.js #   Parametrizuoti testai (test.each)
│   └── performance/
│       └── performance.test.js   #   Našumo testai (10 000 elementų)
├── jest.config.js                # Jest konfigūracija
├── jest.setup.js                 # Jest setup (@testing-library/jest-dom)
└── 

## Duomenų bazės schema (8 lentelės)

User          — Sistemos naudotojai (admin/manager)
Owner         — Gyvūnų savininkai
Pet           — Gyvūnai (su rūšimi, veisle, gimimo data)
Vet           — Veterinarai (su specializacija)
Visit         — Vizitai (diagnozė, pastabos, data)
Service       — Paslaugos (pavadinimas, kaina, kategorija)
VisitService  — Vizito-paslaugos ryšio lentelė (M:N)
Appointment   — Registracijos (data, laiko slotas, statusas)

## Projektavimo šablonai (7)

| Nr. | Šablonas          | Failas                           | Paskirtis                                                         |
|-----|-------------------|----------------------------------|-------------------------------------------------------------------|
| 1 | **Singleton**       | `lib/prisma.js`                  | Vienas `PrismaClient` egzempliorius per procesą |
| 2 | **Factory Method**  | `lib/patterns/responseFactory.js`| Standartizuoti API atsakymai (`success`, `error`, `list`, `created`, `notFound`)                                                                                                           |
| 3 | **Adapter**         | `lib/patterns/adapter.js`        | Prisma modelių konvertavimas į frontend DTO (4 adapteriai)        |
| 4 | **Facade**          | `lib/patterns/facade.js`         | Supaprastinta sąsaja sudėtingoms daugiaslentelėms operacijoms     |
| 5 | **Strategy**        | `lib/patterns/strategy.js`       | Keičiami rūšiavimo algoritmai (pagal vardą, datą, kainą) su lietuviška lokale                                                                                                                |
| 6 | **Observer**        | `lib/patterns/observer.js`       | Atsietų įvykių sistema (vizitai, registracijos, vakcinacijos)     |
| 7 | **Template Method** | `lib/patterns/templateMethod.js` | Bendras CRUD algoritmų karkasas su hook'ais konkretiems servisams |

## Testavimas

13 testų rinkiniai - 336 testai - visi praeina
Coverage: 91% statements, 83% branches, 87% functions, 92% lines

Testų tipai:
- Vienetų testai - kiekvienas šablonas, utilas ir auth modulis
- Išimčių testai - klaidų tikrinimas (validacija, JWT, slaptažodžiai)
- Parametrizuoti testai - `test.each()` su daugybe duomenų kombinacijų
- Našumo testai - 10 000 elementų rūšiavimas ir paieška per <500ms
