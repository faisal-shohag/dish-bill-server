import prisma from "../DB/db.config.js";
import { Router } from "express";
const router = Router();


router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const user = await prisma.users.update({
      where: { id: Number(id) },
      data: data,
    });
    res.status(200).json({ success: true, updated: user });
  } catch (error) {
    console.log(error);
    res.status(400).json({ err: "error" });
  }
});

router.put("/payments/:id", async (req, res) => {
  const { id } = req.params;
  let data = req.body;
  data = {...data, amount: parseInt(data.amount)}
  try {
    const payment = await prisma.payments.update({
      where: { id: Number(id) },
      data: data,
    });
    res.status(200).json({ success: true, updated: payment });
  } catch (error) {
    console.log(error);
    res.status(400).json({ err: "error" });
  }
});





export default router