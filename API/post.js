import prisma from "../DB/db.config.js";
import { Router } from "express";
const router = Router();

router.post("/user", async (req, res) => {
  const data = req.body;
  try {
    const user = await prisma.users.create({ data: data });
    res.status(200).json({ success: true, created: user });
  } catch (error) {
    console.log(error);
    if (error.code == "P2002")
      res
        .status(403)
        .send({ err: "This user already been created!" });
    else res.status(400).json({ err: "error" });
  }
});


//payments
router.post('/payments', async (req, res) => {
  const { month, page = 1, limit } = req.body;
  if (!month) {
    return res.status(400).json({ error: 'Month is required' });
  }

  try {
    // Get all users
    const users = await prisma.users.findMany();

    const newPayments = [];

    // Process each user
    for (const user of users) {
      // Check if payment for the given month already exists for the user
      const existingPayment = await prisma.payments.findFirst({
        where: {
          userId: user.id,
          month: month,
        },
      });

      if (!existingPayment) {
        // Create a new payment entry for the user who doesn't have a payment for this month
        const newPayment = await prisma.payments.create({
          data: {
            userId: user.id,
            amount: 0,
            month: month,
          },
        });
        newPayments.push(newPayment);
      }
    }

    // Calculate the offset for pagination
    const offset = (page - 1) * limit;

    // Fetch paginated payments for the specified month
    const payments = await prisma.payments.findMany({
      where: {
        month: month,
      },
      skip: offset,
      take: limit,
      include: {
        user: true, // Include user details if needed
      },
    });

    // Get total count of payments for the specified month
    const totalPayments = await prisma.payments.count({
      where: {
        month: month,
      },
    });

    const u = []

    for(const pay of payments) {
      const usr = pay.user
      delete pay["user"]
      u.push({...usr, payment: pay})
    }

    res.status(200).json({
      totalPayments,
      page,
      limit,
      totalPages: Math.ceil(totalPayments / limit),
      payments: u,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




export default router


