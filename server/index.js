import express from "express";
import reviewsRouter from "./routes/reviews.js";

const app = express();
app.use(express.json());

app.use(reviewsRouter);

app.listen(3000, () => console.log("API running on 3000"));
