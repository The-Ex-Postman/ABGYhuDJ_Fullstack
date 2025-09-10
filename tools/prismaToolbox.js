
const readline = require('readline');
const prisma = require('../src/config/prisma');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (q) => new Promise(res => rl.question(q, res));

const main = async () => {
  console.log('🧰 Prisma Toolbox');
  console.log('1. Lister tous les utilisateurs');
  console.log('2. Supprimer un utilisateur par email');
  console.log('3. Supprimer tous les utilisateurs sauf un');
  console.log('4. Compter les utilisateurs');
  console.log('5. Créer un utilisateur test');

  const choice = await ask('Choix (1-5) : ');

  switch (choice.trim()) {
    case '1':
      const users = await prisma.user.findMany();
      console.table(users);
      break;

    case '2':
      const emailToDelete = await ask('Email à supprimer : ');
      try {
        await prisma.user.delete({ where: { email: emailToDelete } });
        console.log(`✅ Utilisateur ${emailToDelete} supprimé`);
      } catch (err) {
        console.error('❌ Erreur :', err.message);
      }
      break;

    case '3':
      const emailToKeep = await ask('Email à conserver : ');
      const delCount = await prisma.user.deleteMany({
        where: {
          email: { not: emailToKeep }
        }
      });
      console.log(`✅ ${delCount.count} utilisateurs supprimés (sauf ${emailToKeep})`);
      break;

    case '4':
      const count = await prisma.user.count();
      console.log(`📊 Total utilisateurs : ${count}`);
      break;

    case '5':
      const email = await ask('Email test : ');
      const password = await ask('Mot de passe (hashé ou simple) : ');
      await prisma.user.create({
        data: { email, password, role: 'USER' }
      });
      console.log(`✅ Utilisateur ${email} créé`);
      break;

    default:
      console.log('❌ Choix invalide');
  }

  rl.close();
  await prisma.$disconnect();
};

main();
