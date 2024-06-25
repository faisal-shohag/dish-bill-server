import prisma from "../DB/db.config.js";
import { Router } from "express";
const router = Router();


router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.delete({ where: { id: Number(id) } });
    res.status(200).json({ success: true, deleted: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});




export default router