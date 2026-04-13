require("dotenv").config({ path: "./.env" });
console.log("ENV FILE LOADED");
console.log("MONGO_URI =", process.env.MONGO_URI);

const express = require("express");
const mongoose = require("mongoose");

const cors = require("cors");

const app = express();
const PORT = 5000;

const authRoutes = require("./routes/auth");
const protect = require("./middleware/auth");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected ✅"))
    .catch((err) => console.error("MongoDB error ❌", err));

const Project = require("./models/Project");

process.env.JWT_SECRET = "testsecret";

app.get("/api/status" , (req , res) => {
    res.json({ message: "FPMS backend connected ✅" });
});

app.get("/api/projects" , protect , async(req , res) => {
    try {
        const projects = await Project.find({user: req.user.id});
        res.json(projects);
    } catch (err) {
        res.status(500).json({error: "Failed to fetch projects"});
    }
});

app.post("/api/projects", protect, async (req, res) => {
  try {
    console.log("Incoming body:", req.body);

    const project = await Project.create({
        ...req.body,
        user: req.user.id,
    });
    const savedProject = await project.save();

    res.status(201).json(savedProject);
  } catch (err) {
    console.error("CREATE PROJECT ERROR ❌", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/projects/:projectId/scenes" , protect ,async(req,res) => {
    try {
        const project = await Project.findById(req.params.projectId);
    
    if(!project) {
        return res.status(404).json({error: "Project not found"});
    }
    res.json(project.scenes);
    } catch (err) {
        console.error("GET SCENES ERROR ❌", err);
        res.status(500).json({ error: "Failed to load scenes" });
    }
});


app.post("/api/projects/:projectId/scenes" ,protect, async(req , res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if(!project) {
            return res.status(404).json({error: "Project not found"});
        }

        const {sceneNumber, location, timeOfDay, status} = req.body;

        if (!sceneNumber || !location) {
            return res.status(400).json({
                error: "sceneNumber and location are required",
            });
        }

        const newScene = { sceneNumber , location , timeOfDay , status };
        console.log("Saving scene:" , newScene);

        project.scenes.push(newScene);
        await project.save();

        res.status(201).json(project.scenes.at(-1));
    } catch (err) {
        console.error("ADD SCENE ERROR ❌" , err);
        res.status(500).json({error: err.message});
    }
});

app.put("/api/projects/:projectId/scenes/:sceneId" ,protect, async(req , res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({error: "Project not found"});
        }

        const scene = project.scenes.id(req.params.sceneId);

        if(!scene) {
            return res.status(404).json({error: "Scene not found"});
        }

        Object.assign(scene , req.body);
        await project.save();
        res.json(scene);
    } catch(err) {
        console.error("UPDATE SCENE ERROR ❌", err)
        res.status(500).json({error: err.message});
    }
});

app.delete("/api/projects/:projectId/scenes/:sceneId" ,protect, async(req , res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({error: "Project not found"});
        }

        project.scenes = project.scenes.filter(
            (s) => s._id.toString() !== (req.params.sceneId)
        );

        await project.save();
        res.json({message: "Scene deleted"});
    } catch(err) {
        console.error("DELETE SCENE ERROR ❌", err)
        res.status(500).json({error: err.message});
    }
});

app.get("/api/projects/:projectId/budget", protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.budget) {
            project.budget = {planned: 0, expenses: []};
            await project.save();
        }

        const actualSpent = project.budget.expenses.reduce(
            (sum, e) => sum + e.amount,
            0
        );

        res.json({
            planned: project.budget.planned || 0,
            actual: actualSpent,
            remaining: (project.budget.planned || 0) - actualSpent,
            expenses: project.budget.expenses || [],
        });

    } catch (err) {
        console.error("GET BUDGET ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/projects/:projectId/budget", protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.budget) {
            project.budget = { planned: 0, expenses: []};
        }

        if (!project.budget.expenses) {
            project.budget.expenses = [];
        }

        const { title, amount, category } = req.body;

        if (!title || !amount) {
            return res.status(400).json({
                error: "Title and amount are required",
            });
        }

        const newExpense = { title, amount: Number(amount), category: category || "General" };

        project.budget.expenses.push(newExpense);
        await project.save();

        res.status(201).json(newExpense);
    } catch (err) {
        console.error("ADD EXPENSE ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/projects/:projectId/budget/planned", protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found"});
        }

        const planned = Number(req.body.planned);

        if (isNaN(planned) || planned < 0) {
            return res.status(400).json({ error: "Invalid planned budget" });
        }

        project.budget.planned = planned;
        await project.save();

        res.json(project.budget);
    } catch (err) {
        console.error("UPDATE TOTAL ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/projects/:projectId/budget/:expenseId", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found "});
        }

        if (!project.budget || !project.budget.expenses) {
            return res.status(400).json({ error: "No expenses found" });
        }

        project.budget.expenses = project.budget.expenses.filter(
            e => e._id.toString() !== req.params.expenseId
        );

        await project.save();

        res.json({ message: "Expense deleted "});
    } catch (err) {
        console.error("DELETE EXPENSE ERROR ❌" , err);
        res.status(500).json({error: err.message});
    }
});

app.put("/api/projects/:projectId/budget/:expenseId", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if(!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const expense = project.budget.expenses.id(req.params.expenseId);

        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }

        const { title, amount , category} = req.body;

        expense.title = title;
        expense.amount = Number(amount);
        expense.category = category || "General";

        await project.save();

        res.json(expense);
    } catch (err) {
        console.error("UPDATE EXPENSE ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/projects/:projectId/schedule", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if  (!project) {
            return res.status(404).json({ error: "Project not found"});
        }

        res.json(project.schedule || []);
    } catch (err) {
        console.error("GET SCHEDULE ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/projects/:projectId/schedule", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found "});
        }

        const { date, scene, location, status, notes} = req.body;

        if (!date || !scene) {
            return res.status(400).json({ error: "Date and scene are required "});
        }

        const newItem = {
            date,
            scene,
            location,
            status,
            notes,
        };

        project.schedule.push(newItem);
        await project.save();

        res.status(201).json((project.schedule.at(-1)));
    } catch (err) {
        console.error("ADD SCHEDULE ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/projects/:projectId/schedule/:itemId", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        project.schedule = project.schedule.filter(
            (item) => item._id.toString() !== req.params.itemId
        );

        await project.save();
        res.json({ message: "Schedule item deleted" });
    } catch (err) {
        console.error("DELETE SCHEDULE ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/projects/:projectId/schedule/:itemId" , protect, async (req, res) => {
    console.log("Incoming schedule body:", req.body);
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const item = project.schedule.id(req.params.itemId);
        if (!item) {
            return res.status(404).json({ error: "Schedule item not found" });
        }

        Object.assign(item, req.body);
        await project.save();

        res.json(item);
    } catch (err) {
        console.error("UPDATE SCHEDULE ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/projects/:projectId/crew", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if(!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const { name , role , contact , notes, scenes} = req.body;

        if(!name || !role) {
            return res.status(400).json({ error: "Name and role are required" });
        }

        const newCrew = {name , role , contact , notes, scenes: scenes || [] };
        project.crew.push(newCrew);
        await project.save();

        res.status(201).json(project.crew.at(-1));
    } catch (err) {
        console.error("ADD CREW ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/projects/:projectId/crew", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        res.json(project.crew || []);
    } catch (err) {
        console.error("GET CREW ERROR ❌", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/projects/:projectId/crew/:crewId", protect, async(req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if(!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        project.crew = project.crew.filter(
            (c) => c._id.toString() !== req.params.crewId
        );

        await project.save();
        res.json({ message: "Crew removed" });
    } catch (err) {
        console.error("DELETE CREW ERROR ❌", err);
        res.status(500).json({ error: err.message }); 
    }
});

app.listen(PORT , () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


