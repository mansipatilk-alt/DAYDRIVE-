const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Temporary in-memory task storage
let tasks = [
{
id: 1,
title: "Complete project documentation",
category: "Work",
priority: "High",
dueDate: "Today",
completed: false
},
{
id: 2,
title: "Review React components",
category: "Study",
priority: "Medium",
dueDate: "Today",
completed: false
},
{
id: 3,
title: "Prepare presentation slides",
category: "Work",
priority: "High",
dueDate: "Tomorrow",
completed: false
},
{
id: 4,
title: "Read 10 pages of a book",
category: "Personal",
priority: "Low",
dueDate: "Tomorrow",
completed: true
}
];

let nextId = 5;

// Welcome route
app.get("/", (req, res) => {
res.send("Welcome to DAYDRIVE Backend!");
});

// API status
app.get("/api", (req, res) => {
res.json({
message: "DAYDRIVE API is working successfully!",
project: "DAYDRIVE",
status: "Running"
});
});

// GET all tasks
app.get("/api/tasks", (req, res) => {
res.json(tasks);
});

// POST a new task
app.post("/api/tasks", (req, res) => {
const { title, category, priority, dueDate } = req.body || {};

if (typeof title !== "string" || !title.trim()) {
return res.status(400).json({
message: "Task title is required."
});
}

const newTask = {
id: nextId++,
title: title.trim(),
category: category || "Personal",
priority: priority || "Medium",
dueDate: dueDate || "Today",
completed: false
};

tasks.push(newTask);
return res.status(201).json(newTask);
});

// PUT update a task
app.put("/api/tasks/:id", (req, res) => {
const id = Number(req.params.id);
const task = tasks.find((item) => item.id === id);

if (!task) {
return res.status(404).json({
message: "Task not found."
});
}

const { title, category, priority, dueDate, completed } = req.body || {};

if (title !== undefined) {
if (typeof title !== "string" || !title.trim()) {
return res.status(400).json({
message: "Task title must not be empty."
});
}

```
task.title = title.trim();
```

}

if (category !== undefined) task.category = category;
if (priority !== undefined) task.priority = priority;
if (dueDate !== undefined) task.dueDate = dueDate;
if (completed !== undefined) task.completed = Boolean(completed);

return res.json(task);
});

// DELETE a task
app.delete("/api/tasks/:id", (req, res) => {
const id = Number(req.params.id);
const taskIndex = tasks.findIndex((item) => item.id === id);

if (taskIndex === -1) {
return res.status(404).json({
message: "Task not found."
});
}

const deletedTask = tasks.splice(taskIndex, 1)[0];

return res.json({
message: "Task deleted successfully.",
task: deletedTask
});
});

// Start server
app.listen(PORT, () => {
console.log(`DAYDRIVE backend running at http://localhost:${PORT}`);
});
