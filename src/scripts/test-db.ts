import { prisma } from "../lib/db.js";

async function main() {
  try {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    });
    console.log("Created test user:", user);

    // Query all users
    const users = await prisma.user.findMany();
    console.log("All users:", users);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
