const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Users ---
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.createMany({
    data: [
      { email: 'admin@vetcare.lt', password: passwordHash, name: 'Admin', role: 'admin' },
      { email: 'manager@vetcare.lt', password: passwordHash, name: 'Manageris', role: 'admin' },
    ],
    skipDuplicates: true,
  });
  console.log('Users seeded');

  // --- Owners ---
  const owners = await Promise.all([
    prisma.owner.upsert({ where: { email: 'jonas.kazlauskas@gmail.com' }, update: {}, create: { firstName: 'Jonas', lastName: 'Kazlauskas', phone: '+37061234567', email: 'jonas.kazlauskas@gmail.com', address: 'Gedimino pr. 12, Vilnius' } }),
    prisma.owner.upsert({ where: { email: 'ona.petrauskiene@gmail.com' }, update: {}, create: { firstName: 'Ona', lastName: 'Petrauskienė', phone: '+37062345678', email: 'ona.petrauskiene@gmail.com', address: 'Laisvės al. 45, Kaunas' } }),
    prisma.owner.upsert({ where: { email: 'petras.jonaitis@inbox.lt' }, update: {}, create: { firstName: 'Petras', lastName: 'Jonaitis', phone: '+37063456789', email: 'petras.jonaitis@inbox.lt', address: 'Tilžės g. 8, Klaipėda' } }),
    prisma.owner.upsert({ where: { email: 'aldona.stankeviciene@gmail.com' }, update: {}, create: { firstName: 'Aldona', lastName: 'Stankevičienė', phone: '+37064567890', email: 'aldona.stankeviciene@gmail.com', address: 'Vytauto g. 22, Šiauliai' } }),
    prisma.owner.upsert({ where: { email: 'mindaugas.butkus@gmail.com' }, update: {}, create: { firstName: 'Mindaugas', lastName: 'Butkus', phone: '+37065678901', email: 'mindaugas.butkus@gmail.com', address: 'Dariaus ir Girėno g. 5, Panevėžys' } }),
    prisma.owner.upsert({ where: { email: 'birute.jankauskaite@gmail.com' }, update: {}, create: { firstName: 'Birutė', lastName: 'Jankauskaitė', phone: '+37066789012', email: 'birute.jankauskaite@gmail.com', address: 'Klaipėdos g. 17, Alytus' } }),
    prisma.owner.upsert({ where: { email: 'tomas.vasiliauskas@inbox.lt' }, update: {}, create: { firstName: 'Tomas', lastName: 'Vasiliauskas', phone: '+37067890123', email: 'tomas.vasiliauskas@inbox.lt', address: 'Vilniaus g. 3, Marijampolė' } }),
    prisma.owner.upsert({ where: { email: 'rasa.mockeviciene@gmail.com' }, update: {}, create: { firstName: 'Rasa', lastName: 'Mockevičienė', phone: '+37068901234', email: 'rasa.mockeviciene@gmail.com', address: 'Savanorių pr. 88, Vilnius' } }),
    prisma.owner.upsert({ where: { email: 'gintaras.paulauskas@gmail.com' }, update: {}, create: { firstName: 'Gintaras', lastName: 'Paulauskas', phone: '+37069012345', email: 'gintaras.paulauskas@gmail.com', address: 'Nemuno g. 14, Kaunas' } }),
    prisma.owner.upsert({ where: { email: 'lina.zukauskaite@gmail.com' }, update: {}, create: { firstName: 'Lina', lastName: 'Žukauskaitė', phone: '+37061122334', email: 'lina.zukauskaite@gmail.com', address: 'Taikos pr. 61, Klaipėda' } }),
    prisma.owner.upsert({ where: { email: 'rokas.grigas@inbox.lt' }, update: {}, create: { firstName: 'Rokas', lastName: 'Grigas', phone: '+37062233445', email: 'rokas.grigas@inbox.lt', address: 'Aušros al. 9, Šiauliai' } }),
    prisma.owner.upsert({ where: { email: 'viktorija.tamosiunaite@gmail.com' }, update: {}, create: { firstName: 'Viktorija', lastName: 'Tamošiūnaitė', phone: '+37063344556', email: 'viktorija.tamosiunaite@gmail.com', address: 'Senvagės g. 4, Panevėžys' } }),
    prisma.owner.upsert({ where: { email: 'darius.noreika@gmail.com' }, update: {}, create: { firstName: 'Darius', lastName: 'Noreika', phone: '+37064455667', email: 'darius.noreika@gmail.com', address: 'Partizanų g. 33, Kaunas' } }),
    prisma.owner.upsert({ where: { email: 'egle.simanaviciene@gmail.com' }, update: {}, create: { firstName: 'Eglė', lastName: 'Simanavičienė', phone: '+37065566778', email: 'egle.simanaviciene@gmail.com', address: 'Ukmergės g. 110, Vilnius' } }),
    prisma.owner.upsert({ where: { email: 'arnas.laurinavicius@inbox.lt' }, update: {}, create: { firstName: 'Arnas', lastName: 'Laurinavičius', phone: '+37066677889', email: 'arnas.laurinavicius@inbox.lt', address: 'Sporto g. 6, Alytus' } }),
    prisma.owner.upsert({ where: { email: 'kristina.baliukeviciene@gmail.com' }, update: {}, create: { firstName: 'Kristina', lastName: 'Baliukevičienė', phone: '+37067788990', email: 'kristina.baliukeviciene@gmail.com', address: 'Kęstučio g. 28, Vilnius' } }),
    prisma.owner.upsert({ where: { email: 'saulius.milasius@gmail.com' }, update: {}, create: { firstName: 'Saulius', lastName: 'Milašius', phone: '+37068899001', email: 'saulius.milasius@gmail.com', address: 'Draugystės g. 19, Klaipėda' } }),
    prisma.owner.upsert({ where: { email: 'daiva.urbonaviciene@inbox.lt' }, update: {}, create: { firstName: 'Daiva', lastName: 'Urbonavičienė', phone: '+37069900112', email: 'daiva.urbonaviciene@inbox.lt', address: 'Žemaitės g. 7, Kaunas' } }),
    prisma.owner.upsert({ where: { email: 'valdas.cesnauskas@gmail.com' }, update: {}, create: { firstName: 'Valdas', lastName: 'Česnauskас', phone: '+37061011223', email: 'valdas.cesnauskas@gmail.com', address: 'Kalvarijų g. 125, Vilnius' } }),
    prisma.owner.upsert({ where: { email: 'jurga.andriuskevicius@gmail.com' }, update: {}, create: { firstName: 'Jurga', lastName: 'Andriuškevičiūtė', phone: '+37062122334', email: 'jurga.andriuskevicius@gmail.com', address: 'Pušyno g. 3, Panevėžys' } }),
    prisma.owner.upsert({ where: { email: 'mantas.sapoka@inbox.lt' }, update: {}, create: { firstName: 'Mantas', lastName: 'Šapokas', phone: '+37063233445', email: 'mantas.sapoka@inbox.lt', address: 'Ryto g. 11, Marijampolė' } }),
  ]);
  console.log(`Owners seeded: ${owners.length}`);

  // --- Vets ---
  const vets = await Promise.all([
    prisma.vet.upsert({ where: { email: 'andrius.kavaliauskas@vetcare.lt' }, update: {}, create: { firstName: 'Andrius', lastName: 'Kavaliauskas', specialty: 'Bendrosios praktikos', phone: '+37061111001', email: 'andrius.kavaliauskas@vetcare.lt' } }),
    prisma.vet.upsert({ where: { email: 'laura.rimkeviciene@vetcare.lt' }, update: {}, create: { firstName: 'Laura', lastName: 'Rimkevičienė', specialty: 'Chirurgija', phone: '+37061111002', email: 'laura.rimkeviciene@vetcare.lt' } }),
    prisma.vet.upsert({ where: { email: 'tadas.bernotas@vetcare.lt' }, update: {}, create: { firstName: 'Tadas', lastName: 'Bernotas', specialty: 'Dermatologija', phone: '+37061111003', email: 'tadas.bernotas@vetcare.lt' } }),
    prisma.vet.upsert({ where: { email: 'ingrida.zilinskaite@vetcare.lt' }, update: {}, create: { firstName: 'Ingrida', lastName: 'Žilinskaitė', specialty: 'Odontologija', phone: '+37061111004', email: 'ingrida.zilinskaite@vetcare.lt' } }),
    prisma.vet.upsert({ where: { email: 'rytis.mikalauskas@vetcare.lt' }, update: {}, create: { firstName: 'Rytis', lastName: 'Mikalauskas', specialty: 'Oftalmologija', phone: '+37061111005', email: 'rytis.mikalauskas@vetcare.lt' } }),
    prisma.vet.upsert({ where: { email: 'vilma.jakstiene@vetcare.lt' }, update: {}, create: { firstName: 'Vilma', lastName: 'Jakštienė', specialty: 'Bendrosios praktikos', phone: '+37061111006', email: 'vilma.jakstiene@vetcare.lt' } }),
  ]);
  console.log(`Vets seeded: ${vets.length}`);

  // --- Pets ---
  const pets = await prisma.$transaction([
    prisma.pet.upsert({ where: { id: 1 }, update: {}, create: { name: 'Reksas', species: 'Šuo', breed: 'Labradoras', birthDate: new Date('2019-03-15'), gender: 'Patinas', ownerId: owners[0].id } }),
    prisma.pet.upsert({ where: { id: 2 }, update: {}, create: { name: 'Murkė', species: 'Katė', breed: 'Persų', birthDate: new Date('2020-07-22'), gender: 'Patelė', ownerId: owners[1].id } }),
    prisma.pet.upsert({ where: { id: 3 }, update: {}, create: { name: 'Barsas', species: 'Šuo', breed: 'Vokiečių aviganis', birthDate: new Date('2018-11-05'), gender: 'Patinas', ownerId: owners[2].id } }),
    prisma.pet.upsert({ where: { id: 4 }, update: {}, create: { name: 'Snieguolė', species: 'Katė', breed: 'Maine Coon', birthDate: new Date('2021-01-30'), gender: 'Patelė', ownerId: owners[3].id } }),
    prisma.pet.upsert({ where: { id: 5 }, update: {}, create: { name: 'Džekas', species: 'Šuo', breed: 'Buldogas', birthDate: new Date('2020-05-18'), gender: 'Patinas', ownerId: owners[4].id } }),
    prisma.pet.upsert({ where: { id: 6 }, update: {}, create: { name: 'Pūkė', species: 'Triušis', breed: 'Nykštukas', birthDate: new Date('2022-02-14'), gender: 'Patelė', ownerId: owners[5].id } }),
    prisma.pet.upsert({ where: { id: 7 }, update: {}, create: { name: 'Mažylis', species: 'Žiurkėnas', breed: 'Siriškas', birthDate: new Date('2023-06-01'), gender: 'Patinas', ownerId: owners[6].id } }),
    prisma.pet.upsert({ where: { id: 8 }, update: {}, create: { name: 'Gracija', species: 'Katė', breed: 'Britų trumpaplaukė', birthDate: new Date('2019-09-12'), gender: 'Patelė', ownerId: owners[7].id } }),
    prisma.pet.upsert({ where: { id: 9 }, update: {}, create: { name: 'Tomas', species: 'Šuo', breed: 'Pudelas', birthDate: new Date('2021-04-25'), gender: 'Patinas', ownerId: owners[8].id } }),
    prisma.pet.upsert({ where: { id: 10 }, update: {}, create: { name: 'Žalias', species: 'Papūga', breed: 'Banguotoji papūga', birthDate: new Date('2020-12-03'), gender: 'Patinas', ownerId: owners[9].id } }),
    prisma.pet.upsert({ where: { id: 11 }, update: {}, create: { name: 'Luna', species: 'Katė', breed: 'Siaminė', birthDate: new Date('2022-08-17'), gender: 'Patelė', ownerId: owners[10].id } }),
    prisma.pet.upsert({ where: { id: 12 }, update: {}, create: { name: 'Herkus', species: 'Šuo', breed: 'Haskis', birthDate: new Date('2018-06-30'), gender: 'Patinas', ownerId: owners[11].id } }),
    prisma.pet.upsert({ where: { id: 13 }, update: {}, create: { name: 'Žvaigždutė', species: 'Triušis', breed: 'Angoras', birthDate: new Date('2023-03-10'), gender: 'Patelė', ownerId: owners[12].id } }),
    prisma.pet.upsert({ where: { id: 14 }, update: {}, create: { name: 'Bajoras', species: 'Šuo', breed: 'Bokseris', birthDate: new Date('2020-10-08'), gender: 'Patinas', ownerId: owners[13].id } }),
    prisma.pet.upsert({ where: { id: 15 }, update: {}, create: { name: 'Pilkė', species: 'Katė', breed: 'Rusų mėlynoji', birthDate: new Date('2021-05-20'), gender: 'Patelė', ownerId: owners[14].id } }),
    prisma.pet.upsert({ where: { id: 16 }, update: {}, create: { name: 'Pepas', species: 'Žiurkėnas', breed: 'Džungariškas', birthDate: new Date('2023-09-05'), gender: 'Patinas', ownerId: owners[15].id } }),
    prisma.pet.upsert({ where: { id: 17 }, update: {}, create: { name: 'Koralė', species: 'Papūga', breed: 'Nimfa', birthDate: new Date('2019-11-28'), gender: 'Patelė', ownerId: owners[16].id } }),
    prisma.pet.upsert({ where: { id: 18 }, update: {}, create: { name: 'Zuikis', species: 'Triušis', breed: 'Flamandų milžinas', birthDate: new Date('2022-04-15'), gender: 'Patinas', ownerId: owners[17].id } }),
    prisma.pet.upsert({ where: { id: 19 }, update: {}, create: { name: 'Eira', species: 'Šuo', breed: 'Samojėdas', birthDate: new Date('2021-07-11'), gender: 'Patelė', ownerId: owners[18].id } }),
    prisma.pet.upsert({ where: { id: 20 }, update: {}, create: { name: 'Margis', species: 'Šuo', breed: 'Bīgleris', birthDate: new Date('2019-02-27'), gender: 'Patinas', ownerId: owners[19].id } }),
    prisma.pet.upsert({ where: { id: 21 }, update: {}, create: { name: 'Žibutė', species: 'Katė', breed: 'Ragdoll', birthDate: new Date('2022-10-19'), gender: 'Patelė', ownerId: owners[20].id } }),
    prisma.pet.upsert({ where: { id: 22 }, update: {}, create: { name: 'Tigras', species: 'Katė', breed: 'Bengalų', birthDate: new Date('2020-03-07'), gender: 'Patinas', ownerId: owners[0].id } }),
    prisma.pet.upsert({ where: { id: 23 }, update: {}, create: { name: 'Čiupas', species: 'Šuo', breed: 'Čihuahua', birthDate: new Date('2023-01-22'), gender: 'Patinas', ownerId: owners[1].id } }),
    prisma.pet.upsert({ where: { id: 24 }, update: {}, create: { name: 'Smilga', species: 'Papūga', breed: 'Banguotoji papūga', birthDate: new Date('2021-06-14'), gender: 'Patelė', ownerId: owners[2].id } }),
    prisma.pet.upsert({ where: { id: 25 }, update: {}, create: { name: 'Bruno', species: 'Šuo', breed: 'Bernardas', birthDate: new Date('2017-08-03'), gender: 'Patinas', ownerId: owners[3].id } }),
    prisma.pet.upsert({ where: { id: 26 }, update: {}, create: { name: 'Nora', species: 'Katė', breed: 'Škotų sulenkiausiais', birthDate: new Date('2022-12-25'), gender: 'Patelė', ownerId: owners[4].id } }),
  ]);
  console.log(`Pets seeded: ${pets.length}`);

  // --- Services ---
  const services = await prisma.$transaction([
    prisma.service.upsert({ where: { id: 1 }, update: {}, create: { name: 'Vakcinacija', description: 'Profilaktinė vakcinacija nuo pasiutligės ir kitų ligų', price: 25.00, category: 'Profilaktika' } }),
    prisma.service.upsert({ where: { id: 2 }, update: {}, create: { name: 'Profilaktinė apžiūra', description: 'Bendras sveikatos patikrinimas', price: 20.00, category: 'Profilaktika' } }),
    prisma.service.upsert({ where: { id: 3 }, update: {}, create: { name: 'Chirurginė operacija', description: 'Mažos apimties chirurginė intervencija', price: 150.00, category: 'Chirurgija' } }),
    prisma.service.upsert({ where: { id: 4 }, update: {}, create: { name: 'Dantų valymas', description: 'Profesionalus dantų akmenų šalinimas', price: 60.00, category: 'Odontologija' } }),
    prisma.service.upsert({ where: { id: 5 }, update: {}, create: { name: 'Kraujo tyrimas', description: 'Pilnas kraujo tyrimas', price: 35.00, category: 'Diagnostika' } }),
    prisma.service.upsert({ where: { id: 6 }, update: {}, create: { name: 'Rentgenas', description: 'Rentgeno nuotrauka', price: 45.00, category: 'Diagnostika' } }),
    prisma.service.upsert({ where: { id: 7 }, update: {}, create: { name: 'Ultragarso tyrimas', description: 'Pilvo ertmės ultragarsas', price: 50.00, category: 'Diagnostika' } }),
    prisma.service.upsert({ where: { id: 8 }, update: {}, create: { name: 'Mikroschemos implantavimas', description: 'Elektroninio žymens įdiegimas', price: 30.00, category: 'Profilaktika' } }),
    prisma.service.upsert({ where: { id: 9 }, update: {}, create: { name: 'Sterilizacija', description: 'Chirurginė sterilizacija', price: 120.00, category: 'Chirurgija' } }),
    prisma.service.upsert({ where: { id: 10 }, update: {}, create: { name: 'Kailio priežiūra', description: 'Profesionalus kailio kirpimas ir priežiūra', price: 40.00, category: 'Grooming' } }),
    prisma.service.upsert({ where: { id: 11 }, update: {}, create: { name: 'Nagų kirpimas', description: 'Nagų trumpinimas ir apdirbimas', price: 15.00, category: 'Grooming' } }),
    prisma.service.upsert({ where: { id: 12 }, update: {}, create: { name: 'Parazitų gydymas', description: 'Blusų, erkių ir kirminų gydymas', price: 28.00, category: 'Profilaktika' } }),
  ]);
  console.log(`Services seeded: ${services.length}`);

  // --- Visits ---
  const visits = await prisma.$transaction([
    prisma.visit.upsert({ where: { id: 1 },  update: {}, create: { date: new Date('2024-01-10'), diagnosis: 'Sveika', notes: 'Profilaktinė apžiūra', petId: pets[0].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 2 },  update: {}, create: { date: new Date('2024-01-15'), diagnosis: 'Odos uždegimas', notes: 'Paskirti antibiotikai', petId: pets[1].id, vetId: vets[2].id } }),
    prisma.visit.upsert({ where: { id: 3 },  update: {}, create: { date: new Date('2024-02-03'), diagnosis: 'Lūžis', notes: 'Priekinė koja, įtvaras 4 savaitėms', petId: pets[2].id, vetId: vets[1].id } }),
    prisma.visit.upsert({ where: { id: 4 },  update: {}, create: { date: new Date('2024-02-18'), diagnosis: 'Dantų akmuo', notes: 'Rekomenduojamas dantų valymas', petId: pets[3].id, vetId: vets[3].id } }),
    prisma.visit.upsert({ where: { id: 5 },  update: {}, create: { date: new Date('2024-03-05'), diagnosis: 'Virškinimo sutrikimai', notes: 'Dieta 2 savaites', petId: pets[4].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 6 },  update: {}, create: { date: new Date('2024-03-20'), diagnosis: 'Sveikas', notes: 'Vakcinacija atlikta', petId: pets[5].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 7 },  update: {}, create: { date: new Date('2024-04-08'), diagnosis: 'Konjunktyvitas', notes: 'Akių lašai 7 dienas', petId: pets[6].id, vetId: vets[4].id } }),
    prisma.visit.upsert({ where: { id: 8 },  update: {}, create: { date: new Date('2024-04-22'), diagnosis: 'Sveika', notes: 'Metinė apžiūra', petId: pets[7].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 9 },  update: {}, create: { date: new Date('2024-05-10'), diagnosis: 'Ausų uždegimas', notes: 'Ausų lašai 10 dienų', petId: pets[8].id, vetId: vets[2].id } }),
    prisma.visit.upsert({ where: { id: 10 }, update: {}, create: { date: new Date('2024-05-28'), diagnosis: 'Sveikas', notes: 'Nupjauti nagai', petId: pets[9].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 11 }, update: {}, create: { date: new Date('2024-06-14'), diagnosis: 'Sterilizacija', notes: 'Operacija atlikta sėkmingai', petId: pets[10].id, vetId: vets[1].id } }),
    prisma.visit.upsert({ where: { id: 12 }, update: {}, create: { date: new Date('2024-06-30'), diagnosis: 'Šlubavimas', notes: 'Rentgenas, sąnario uždegimas', petId: pets[11].id, vetId: vets[1].id } }),
    prisma.visit.upsert({ where: { id: 13 }, update: {}, create: { date: new Date('2024-07-15'), diagnosis: 'Sveika', notes: 'Mikroschema įdiegta', petId: pets[12].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 14 }, update: {}, create: { date: new Date('2024-07-29'), diagnosis: 'Alergija', notes: 'Antihistamininiai vaistai', petId: pets[13].id, vetId: vets[2].id } }),
    prisma.visit.upsert({ where: { id: 15 }, update: {}, create: { date: new Date('2024-08-12'), diagnosis: 'Sveikas', notes: 'Kasmetinė vakcinacija', petId: pets[14].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 16 }, update: {}, create: { date: new Date('2024-08-26'), diagnosis: 'Viduriavimas', notes: 'Probiotikai 5 dienas', petId: pets[0].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 17 }, update: {}, create: { date: new Date('2024-09-09'), diagnosis: 'Katarakta', notes: 'Operacijos konsultacija', petId: pets[1].id, vetId: vets[4].id } }),
    prisma.visit.upsert({ where: { id: 18 }, update: {}, create: { date: new Date('2024-09-23'), diagnosis: 'Kraujo tyrimas', notes: 'Rezultatai normalūs', petId: pets[2].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 19 }, update: {}, create: { date: new Date('2024-10-07'), diagnosis: 'Dantų operacija', notes: 'Pašalintas vienas dantas', petId: pets[3].id, vetId: vets[3].id } }),
    prisma.visit.upsert({ where: { id: 20 }, update: {}, create: { date: new Date('2024-10-21'), diagnosis: 'Sveika', notes: 'Kailio apžiūra ir priežiūra', petId: pets[4].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 21 }, update: {}, create: { date: new Date('2024-11-04'), diagnosis: 'Kvėpavimo takų infekcija', notes: 'Antibiotikai 7 dienos', petId: pets[15].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 22 }, update: {}, create: { date: new Date('2024-11-18'), diagnosis: 'Sveika', notes: 'Profilaktinė apžiūra', petId: pets[16].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 23 }, update: {}, create: { date: new Date('2024-12-02'), diagnosis: 'Trauminis sužeidimas', notes: 'Žaizda aptvarsyta', petId: pets[17].id, vetId: vets[1].id } }),
    prisma.visit.upsert({ where: { id: 24 }, update: {}, create: { date: new Date('2024-12-16'), diagnosis: 'Sveika', notes: 'Vakcinacija', petId: pets[18].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 25 }, update: {}, create: { date: new Date('2025-01-08'), diagnosis: 'Nutukimas', notes: 'Dietos programa pradėta', petId: pets[19].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 26 }, update: {}, create: { date: new Date('2025-01-22'), diagnosis: 'Sveika', notes: 'Mikroschema', petId: pets[20].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 27 }, update: {}, create: { date: new Date('2025-02-05'), diagnosis: 'Odos grybelis', notes: 'Antimikrobinis šampūnas', petId: pets[21].id, vetId: vets[2].id } }),
    prisma.visit.upsert({ where: { id: 28 }, update: {}, create: { date: new Date('2025-02-19'), diagnosis: 'Sveika', notes: 'Nagų kirpimas', petId: pets[22].id, vetId: vets[5].id } }),
    prisma.visit.upsert({ where: { id: 29 }, update: {}, create: { date: new Date('2025-03-05'), diagnosis: 'Akių infekcija', notes: 'Akių lašai 5 dienas', petId: pets[23].id, vetId: vets[4].id } }),
    prisma.visit.upsert({ where: { id: 30 }, update: {}, create: { date: new Date('2025-03-18'), diagnosis: 'Sveika', notes: 'Metinė apžiūra', petId: pets[24].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 31 }, update: {}, create: { date: new Date('2025-04-02'), diagnosis: 'Inkstų akmenys', notes: 'Ultragarsas, specialus maistas', petId: pets[25].id, vetId: vets[0].id } }),
    prisma.visit.upsert({ where: { id: 32 }, update: {}, create: { date: new Date('2025-04-15'), diagnosis: 'Dantų akmuo', notes: 'Valymas atliktas', petId: pets[5].id, vetId: vets[3].id } }),
  ]);
  console.log(`Visits seeded: ${visits.length}`);

  // --- VisitServices ---
  await prisma.visitService.createMany({
    skipDuplicates: true,
    data: [
      { visitId: visits[0].id,  serviceId: services[1].id },
      { visitId: visits[1].id,  serviceId: services[1].id },
      { visitId: visits[1].id,  serviceId: services[4].id },
      { visitId: visits[2].id,  serviceId: services[5].id },
      { visitId: visits[2].id,  serviceId: services[2].id },
      { visitId: visits[3].id,  serviceId: services[3].id },
      { visitId: visits[4].id,  serviceId: services[1].id },
      { visitId: visits[4].id,  serviceId: services[4].id },
      { visitId: visits[5].id,  serviceId: services[0].id },
      { visitId: visits[6].id,  serviceId: services[1].id },
      { visitId: visits[7].id,  serviceId: services[1].id },
      { visitId: visits[7].id,  serviceId: services[10].id },
      { visitId: visits[8].id,  serviceId: services[1].id },
      { visitId: visits[9].id,  serviceId: services[10].id },
      { visitId: visits[10].id, serviceId: services[8].id },
      { visitId: visits[11].id, serviceId: services[5].id },
      { visitId: visits[11].id, serviceId: services[6].id },
      { visitId: visits[12].id, serviceId: services[7].id },
      { visitId: visits[13].id, serviceId: services[1].id },
      { visitId: visits[13].id, serviceId: services[4].id },
      { visitId: visits[14].id, serviceId: services[0].id },
      { visitId: visits[15].id, serviceId: services[1].id },
      { visitId: visits[16].id, serviceId: services[1].id },
      { visitId: visits[17].id, serviceId: services[4].id },
      { visitId: visits[18].id, serviceId: services[3].id },
      { visitId: visits[19].id, serviceId: services[9].id },
      { visitId: visits[20].id, serviceId: services[1].id },
      { visitId: visits[21].id, serviceId: services[1].id },
      { visitId: visits[21].id, serviceId: services[0].id },
      { visitId: visits[22].id, serviceId: services[2].id },
      { visitId: visits[23].id, serviceId: services[0].id },
      { visitId: visits[24].id, serviceId: services[1].id },
      { visitId: visits[25].id, serviceId: services[7].id },
      { visitId: visits[26].id, serviceId: services[1].id },
      { visitId: visits[26].id, serviceId: services[11].id },
      { visitId: visits[27].id, serviceId: services[10].id },
      { visitId: visits[28].id, serviceId: services[1].id },
      { visitId: visits[29].id, serviceId: services[1].id },
      { visitId: visits[29].id, serviceId: services[6].id },
      { visitId: visits[30].id, serviceId: services[3].id },
      { visitId: visits[31].id, serviceId: services[3].id },
    ],
  });
  console.log('VisitServices seeded');

  // --- Appointments ---
  await prisma.appointment.createMany({
    skipDuplicates: true,
    data: [
      { date: new Date('2025-01-14'), timeSlot: '09:00', status: 'completed',  notes: 'Vakcinacija',           petId: pets[0].id,  vetId: vets[0].id, ownerId: owners[0].id },
      { date: new Date('2025-01-14'), timeSlot: '11:00', status: 'completed',  notes: 'Apžiūra',               petId: pets[1].id,  vetId: vets[2].id, ownerId: owners[1].id },
      { date: new Date('2025-01-28'), timeSlot: '10:00', status: 'completed',  notes: 'Kraujo tyrimas',        petId: pets[2].id,  vetId: vets[1].id, ownerId: owners[2].id },
      { date: new Date('2025-02-04'), timeSlot: '14:00', status: 'completed',  notes: 'Dantų apžiūra',         petId: pets[3].id,  vetId: vets[3].id, ownerId: owners[3].id },
      { date: new Date('2025-02-11'), timeSlot: '09:00', status: 'cancelled',  notes: 'Savininkas nepasirodė', petId: pets[4].id,  vetId: vets[0].id, ownerId: owners[4].id },
      { date: new Date('2025-02-18'), timeSlot: '12:00', status: 'completed',  notes: 'Profilaktika',          petId: pets[5].id,  vetId: vets[5].id, ownerId: owners[5].id },
      { date: new Date('2025-02-25'), timeSlot: '15:00', status: 'cancelled',  notes: 'Atšaukta',              petId: pets[6].id,  vetId: vets[4].id, ownerId: owners[6].id },
      { date: new Date('2025-03-04'), timeSlot: '10:00', status: 'completed',  notes: 'Sterilizacija',         petId: pets[10].id, vetId: vets[1].id, ownerId: owners[10].id },
      { date: new Date('2025-03-11'), timeSlot: '13:00', status: 'completed',  notes: 'Odos patikrinimas',     petId: pets[13].id, vetId: vets[2].id, ownerId: owners[13].id },
      { date: new Date('2025-03-25'), timeSlot: '16:00', status: 'completed',  notes: 'Metinė apžiūra',        petId: pets[19].id, vetId: vets[0].id, ownerId: owners[19].id },
      { date: new Date('2026-02-24'), timeSlot: '09:00', status: 'scheduled',  notes: 'Vakcinacija',           petId: pets[7].id,  vetId: vets[0].id, ownerId: owners[7].id },
      { date: new Date('2026-02-24'), timeSlot: '11:00', status: 'scheduled',  notes: 'Odontologinė apžiūra',  petId: pets[8].id,  vetId: vets[3].id, ownerId: owners[8].id },
      { date: new Date('2026-02-25'), timeSlot: '10:00', status: 'scheduled',  notes: 'Akių tyrimas',          petId: pets[9].id,  vetId: vets[4].id, ownerId: owners[9].id },
      { date: new Date('2026-02-25'), timeSlot: '14:00', status: 'scheduled',  notes: 'Profilaktinė apžiūra',  petId: pets[11].id, vetId: vets[5].id, ownerId: owners[11].id },
      { date: new Date('2026-02-26'), timeSlot: '09:00', status: 'scheduled',  notes: 'Chirurginė konsultacija', petId: pets[12].id, vetId: vets[1].id, ownerId: owners[12].id },
      { date: new Date('2026-02-26'), timeSlot: '13:00', status: 'scheduled',  notes: 'Dermatologinė apžiūra', petId: pets[14].id, vetId: vets[2].id, ownerId: owners[14].id },
      { date: new Date('2026-03-03'), timeSlot: '15:00', status: 'scheduled',  notes: 'Mikroschema',           petId: pets[15].id, vetId: vets[0].id, ownerId: owners[15].id },
      { date: new Date('2026-03-03'), timeSlot: '16:00', status: 'scheduled',  notes: 'Apžiūra',               petId: pets[16].id, vetId: vets[5].id, ownerId: owners[16].id },
      { date: new Date('2026-03-10'), timeSlot: '10:00', status: 'scheduled',  notes: 'Kraujo tyrimas',        petId: pets[17].id, vetId: vets[0].id, ownerId: owners[17].id },
      { date: new Date('2026-03-17'), timeSlot: '11:00', status: 'scheduled',  notes: 'Vakcinacija',           petId: pets[18].id, vetId: vets[0].id, ownerId: owners[18].id },
    ],
  });
  console.log('Appointments seeded');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
