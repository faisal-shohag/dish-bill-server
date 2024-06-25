import prisma from "../DB/db.config.js";
import { Router } from "express";
const router = Router();


router.get("/users", async (req, res) => {
  try {
    const users = await prisma.users.findMany();
    res.status(200).json({ success: true, users: users });
  } catch (error) {
    console.log(error);
    res.status(400).json({ err: "error" });
  }
})

router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the user and their filtered payments
    const user = await prisma.users.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        payments: {
          where: {
            status: {
              in: ['pending', 'paid']
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate the total payments for the user with the specified statuses
    const totalPayments = await prisma.payments.aggregate({
      _sum: {
        amount: true
      },
      where: {
        userId: parseInt(id),
        status: {
          in: ['pending', 'paid']
        }
      }
    });

    // Add the total payments to the user object
    const userWithTotalPayments = {
      ...user,
      totalPayments: totalPayments._sum.amount ? totalPayments._sum.amount : 0
    };

    res.status(200).json({ success: true, user: userWithTotalPayments });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Error fetching user details" });
  }
});


// user payments
router.get("/users/:id/payments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const payments = await prisma.payments.findMany({
      where: {
        userId: parseInt(id),
        status: {
          in: ['pending', 'paid']
        }
      },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: {
        date: "desc",
      },
    });

    const totalPayments = await prisma.payments.count({
      where: {
        userId: parseInt(id),
        status: {
          in: ['pending', 'paid']
        }
      },
    });

    res.status(200).json({
      success: true,
      payments,
      totalPages: Math.ceil(totalPayments / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Error fetching payments" });
  }
});




router.get("/admins/:email", async (req, res) => {
    try {
      const { email } = req.params;
      console.log(email);
      const admin = await prisma.admins.findUnique({
        where: {
          email: email
        }
      });
      res.status(200).json({ success: true, admin: admin });
    } catch (error) {
      console.log(error);
      res.status(400).json({ err: "error" });
    }
})


// stats/count
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.users.count();
    const totalActiveUsers = await prisma.users.count({
      where: { status: 'active' },
    });
    const totalInactiveUsers = await prisma.users.count({
      where: { status: 'inactive' },
    });

    const totalIncome = await prisma.payments.aggregate({
      _sum: {
        amount: true,
      },
    });

    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const monthlyIncome = await prisma.payments.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        date: {
          gte: firstDayOfMonth,
          lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
        },
      },
    });

    const monthlyAverageIncome = await prisma.payments.aggregate({
      _avg: {
        amount: true,
      },
      where: {
        date: {
          gte: firstDayOfMonth,
        },
      },
    });

    res.json({
      totalUsers,
      totalActiveUsers,
      totalInactiveUsers,
      totalIncome: totalIncome._sum.amount ? totalIncome._sum.amount : 0,
      thisMonthIncome: monthlyIncome._sum.amount ? monthlyIncome._sum.amount : 0,
      monthlyAverageIncome: monthlyAverageIncome._avg.amount ? monthlyAverageIncome._avg.amount : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//users with pagination and search
router.get("/users-with-search", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const searchId = parseInt(search);
    const searchConditions = search
      ? {
          OR: [
            { id: isNaN(searchId) ? undefined : searchId },
            { name: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
           // { id: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const users = await prisma.users.findMany({
      where: searchConditions,
      orderBy: {
        id: "asc",
      },
      skip: search ? 0 : (page - 1) * limit,
      take: parseInt(limit),
    });

    const totalUsers = await prisma.users.count({
      where: searchConditions,
    });

    res.status(200).json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    res.status(400).json({ err: err.message });
    console.log(err);
  }
});






export default router