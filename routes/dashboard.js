import { Router } from "express";
import {
    deleteUserById,
    getAllUsers,
    getUserById,
    registerUser,
    updateUserById
} from "../controllers/usersController.js";
import { createUserValidator, updateUserValidator } from "../models/User.js";
import {authenticateToken, authorizeRole,  validatorMiddleware} from "../middlewares/index.js"
import { addNote, deleteNoteById, getAllNotes, getNoteById, updateNoteById } from "../controllers/notesController.js";
import { createNoteValidator, updateNoteValidator } from "../models/Note.js";

const usersRouter = Router();

// usersRouter.use(authenticateToken); // protect all routes
// usersRouter.use(authorizeRole('admin'));

// users routes
usersRouter.get("/users/", getAllUsers);
usersRouter.get("/users/:id", getUserById );
usersRouter.post("/users/", createUserValidator, validatorMiddleware, registerUser);
usersRouter.put("/users/:id", updateUserValidator,validatorMiddleware, updateUserById);
usersRouter.delete("/users/:id", deleteUserById);

// notes routes (I still working on it )
usersRouter.get("/notes/", getAllNotes);
usersRouter.get("/notes/:id", getNoteById);
usersRouter.post("/notes/", createNoteValidator, validatorMiddleware, addNote);
usersRouter.put("/notes/:id", updateNoteValidator, validatorMiddleware, updateNoteById);
usersRouter.delete("/notes/:id", deleteNoteById);

export default usersRouter;
