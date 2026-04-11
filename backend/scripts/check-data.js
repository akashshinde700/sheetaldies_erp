const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const parties = await prisma.party.findMany({ select: { id: true, name: true, gstin: true, pan: true } });
    console.log('Parties:', parties.length);
    parties.forEach(p => console.log('  ' + p.id + ': ' + p.name + ' (' + (p.gstin || 'No GST') + ', ' + (p.pan || 'No PAN') + ')'));

    const jobcards = await prisma.jobcard.findMany();
    console.log('Job Cards:', jobcards.length);

    const jobworkChallans = await prisma.jobworkChallan.findMany();
    console.log('Jobwork Challans:', jobworkChallans.length);

    const machines = await prisma.machine.findMany();
    console.log('Machines:', machines.length);

    const items = await prisma.item.findMany();
    console.log('Items:', items.length);

    const challanItems = await prisma.challanItem.findMany();
    console.log('Challan Items:', challanItems.length);

    const processes = await prisma.process.findMany();
    console.log('Processes:', processes.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();