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
      where: {
        status: 'paid',
      },
    });

    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const thisMonthIncome = await prisma.payments.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'paid',
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
        status: 'paid',
        date: {
          gte: firstDayOfMonth,
        },
      },
    });

    const pendingPaymentsCount = await prisma.payments.count({
      where: { status: 'pending' },
    });

    const notCollectedPaymentsCount = await prisma.payments.count({
      where: { status: 'not-collected' },
    });

    res.json({
      totalUsers,
      totalActiveUsers,
      totalInactiveUsers,
      totalIncome: totalIncome._sum.amount ? totalIncome._sum.amount : 0,
      thisMonthIncome: thisMonthIncome._sum.amount ? thisMonthIncome._sum.amount : 0,
      monthlyAverageIncome: monthlyAverageIncome._avg.amount ? monthlyAverageIncome._avg.amount : 0,
      pendingPaymentsCount,
      notCollectedPaymentsCount,
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

//payments state
router.get("/payments-statistics", async (req, res) => {
  try {
    // Current date and the first day of the current month
    const currentDate = new Date();
    const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Total paid payments
    const totalPaidPaymentsResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: { status: 'paid' }
    });
    const totalPaidPayments = totalPaidPaymentsResult._sum.amount || 0;

    // Total pending payments
    const totalPendingPaymentsResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: { status: 'pending' }
    });
    const totalPendingPayments = totalPendingPaymentsResult._sum.amount || 0;

    // Total pending payments this month
    const totalPendingThisMonthResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'pending',
        date: { gte: firstDayOfCurrentMonth }
      }
    });
    const totalPendingThisMonth = totalPendingThisMonthResult._sum.amount || 0;

    // Total paid payments this month
    const totalPaidThisMonthResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'paid',
        date: { gte: firstDayOfCurrentMonth }
      }
    });
    const totalPaidThisMonth = totalPaidThisMonthResult._sum.amount || 0;

    // Total not collected payments
    const totalNotCollectedPaymentsResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: { status: 'not-collected' }
    });
    const totalNotCollectedPayments = totalNotCollectedPaymentsResult._sum.amount || 0;

    // Total not collected payments this month
    const totalNotCollectedThisMonthResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'not-collected',
        date: { gte: firstDayOfCurrentMonth }
      }
    });
    const totalNotCollectedThisMonth = totalNotCollectedThisMonthResult._sum.amount || 0;

    // Total payments count
    const totalPaymentsCount = await prisma.payments.count();

    // Pending payments count
    const pendingPaymentsCount = await prisma.payments.count({
      where: { status: 'pending' }
    });

    // Not collected payments count
    const notCollectedPaymentsCount = await prisma.payments.count({
      where: { status: 'not-collected' }
    });

    res.status(200).json({
      success: true,
      totalPaidPayments,
      totalPendingPayments,
      totalPendingThisMonth,
      totalPaidThisMonth,
      totalNotCollectedPayments,
      totalNotCollectedThisMonth,
      totalPaymentsCount,
      pendingPaymentsCount,
      notCollectedPaymentsCount
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: "Error fetching payments summary" });
  }
});

//payment report
router.get("/payments-report", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(startDate, endDate);

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch total paid payments between the specified dates
    const totalPaidResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'paid',
        date: {
          gte: start,
          lte: end
        }
      }
    });
    const totalPaid = totalPaidResult._sum.amount || 0;

    // Fetch total pending payments between the specified dates
    const totalPendingResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'pending',
        date: {
          gte: start,
          lte: end
        }
      }
    });
    const totalPending = totalPendingResult._sum.amount || 0;

    const totalNotCollectedResult = await prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'not-collected',
        date: {
          gte: start,
          lte: end
        }
      }
    });
    const totalNotCollected = totalNotCollectedResult._sum.amount || 0;

    // Fetch all payments between the specified dates
    const payments = await prisma.payments.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        },
        status: { in: ['pending', 'paid', 'not-collected'] }
      },
      orderBy: {
        date: "asc"
      },
      include: { user: true }
    });

    res.status(200).json({
      success: true,
      totalPaid,
      totalPending,
      totalNotCollected,
      payments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching payments report" });
  }
});

//payments search
router.get('/payments-search', async (req, res) => {
  try {
    const { page = 1, limit = 10, search="" } = req.query;
    let s = ""
    if(search.includes("|")){
      s = search.split("|")[1]
      s === "*" ? s = "" : s = s 
    }


     const searchConditions = search
      ? {
          OR: [
            { month: { contains: search, mode: "insensitive" } },
            { status: { contains: s, mode: "insensitive" } },
          ],
        }
      : {};

    const payments = await prisma.payments.findMany({
      where: searchConditions,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: {
        date: 'desc', // Optional: you can change this to any field you want to order by
      },
      include: {
        user: true, // Include user details if needed
      },
    });

    const totalPayments = await prisma.payments.count({
      where: searchConditions,
    });

    res.status(200).json({
      success: true,
      payments,
      totalPages: Math.ceil(totalPayments / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, message: 'Error fetching payments' });
  }
});




export default router