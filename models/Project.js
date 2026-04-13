const mongoose = require("mongoose");

const SceneSchema = new mongoose.Schema({
    sceneNumber: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
    },
    timeOfDay: {
        type: String,
        default: "Day",
    },
    status: {
        type: String,
        default: "Not Shot",
    },
    },
    { timestamps: true }
);

const ProjectSchema = new mongoose.Schema({
    title: {type: String, required: true, trim: true},
    genre: String,
    status: String,
    description: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    scenes: [SceneSchema],
    budget: {
        planned: {
            type: Number,
            default: 0,
        },
        expenses: [
            {
                title: {
                    type: String,
                    required: true,
                    trim: true,
                },
                amount: {
                    type: Number,
                    required: true,
                },
                category: {
                    type: String,
                    default: "General",
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    schedule: [
        {
            date: {
                type: Date,
                required: true,
            },
            scene: {
                type: String,
                required: true,
            },
            location: {
                type: String,
            },
            status: {
                type: String,
                default: "Planned",
            },
            notes: {
                type: String,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    crew: [
        {
            name: {
                type: String,
                reqired: true,
                trim: true,
            },
            role: {
                type: String,
                required: true,
            },
            contact: {
                type: String,
                default: "",
            },
            notes: {
                type: String,
                default: "",
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            scenes: {
                type: [String],
                default: [],
            },
        },
    ],
    user: {
        type: require("mongoose").Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    },
    { timestamps: true}

);

module.exports = mongoose.model("Project", ProjectSchema);