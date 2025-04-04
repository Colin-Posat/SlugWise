import { Request, Response } from "express";
import admin from "firebase-admin";

const db = admin.firestore();

// Create a new flashcard set
export const createSet = async (req: Request, res: Response): Promise<void> => {
  try {
    // ... (existing code for extraction and validation) ...
    const { id, title, classCode, flashcards, isPublic, userId, description = '' } = req.body;

    if (!id || !title || !classCode || !Array.isArray(flashcards) || flashcards.length === 0 || !userId) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const existingDoc = await db.collection("flashcardSets").doc(id).get();
    if (existingDoc.exists) {
      res.status(409).json({ message: "A set with this ID already exists" });
      return;
    }

    await db.collection("flashcardSets").doc(id).set({
      id,
      title,
      classCode,
      description: description.trim(),
      flashcards,
      isPublic: Boolean(isPublic),
      icon: isPublic
        ? "/FliplyPNGs/public_flashcard_icon.png"
        : "/FliplyPNGs/private_flashcard.png",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      numCards: flashcards.length,
      isDerived: false // Explicitly mark as NOT derived/saved
    });

    console.log('Successfully created set with ID:', id);
    res.status(201).json({
      message: "Flashcard set created successfully",
      id
    });
  } catch (error) {
    console.error("Error creating flashcard set:", error);
    res.status(500).json({
      message: "Failed to create flashcard set",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Update an existing flashcard set
export const updateSet = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the set ID from the URL parameter
    const setId = req.params.id;
    
    // Extract data from request body
    const { title, classCode, flashcards, isPublic, userId, description = '' } = req.body;
    
    // Validate required fields
    if (!title || !classCode || !Array.isArray(flashcards) || flashcards.length === 0 || !userId) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    
    // Check if the document exists
    const docSnapshot = await db.collection("flashcardSets").doc(setId).get();
    
    if (!docSnapshot.exists) {
      res.status(404).json({ message: "Flashcard set not found" });
      return;
    }
    
    // Get the set data
    const setData = docSnapshot.data();
    
    // Check if the user is the owner of the set
    if (setData && setData.userId !== userId) {
      res.status(403).json({ message: "You do not have permission to update this set" });
      return;
    }
    
    // Update the document
    await db.collection("flashcardSets").doc(setId).update({
      title,
      classCode,
      description: description.trim(), // Add description here
      flashcards,
      isPublic: Boolean(isPublic),
      icon: isPublic 
        ? "/FliplyPNGs/public_flashcard_icon.png" 
        : "/FliplyPNGs/private_flashcard.png",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      numCards: flashcards.length
    });
    
    console.log('Successfully updated set with ID:', setId);
    res.status(200).json({ 
      message: "Flashcard set updated successfully",
      id: setId 
    });
  } catch (error) {
    console.error("Error updating flashcard set:", error);
    res.status(500).json({ 
      message: "Failed to update flashcard set",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get flashcard sets for a specific user
export const getUserSets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    // Query for sets created by the user that are NOT derived/saved
    const setsSnapshot = await db.collection("flashcardSets")
      .where("userId", "==", userId)
      .where("isDerived", "==", false) // <-- Key change: Only get original sets
      .orderBy("createdAt", "desc")
      .get();

    if (setsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }

    const sets = setsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${sets.length} originally created sets for user ${userId}`);
    res.status(200).json(sets);
  } catch (error) {
    console.error("Error getting user's created sets:", error);
    res.status(500).json({
      message: "Failed to get user's created sets",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// --- Add NEW function to get ONLY saved sets ---
// This function will power the "Saved Sets" view
export const getSavedSets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    // Query for sets associated with the user that ARE derived/saved
    const setsSnapshot = await db.collection("flashcardSets")
      .where("userId", "==", userId)
      .where("isDerived", "==", true) // <-- Key change: Only get saved sets
      .orderBy("createdAt", "desc") // Order by when they were saved
      .get();

    if (setsSnapshot.empty) {
      res.status(200).json([]);
      return;
    }

    // Optional: Fetch original owner info if needed for display
    // (Similar logic as in getSetsByClassCode, but might need optimization
    // if you fetch many saved sets often)

    const sets = setsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
      // Potentially add fields like 'originalOwnerUsername' here if needed
    }));

    console.log(`Found ${sets.length} saved sets for user ${userId}`);
    res.status(200).json(sets);
  } catch (error) {
    console.error("Error getting user's saved sets:", error);
    res.status(500).json({
      message: "Failed to get user's saved sets",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get a specific flashcard set by ID
export const getSetById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the set ID from the URL parameter
    const setId = req.params.id;
    
    // Get the document
    const docSnapshot = await db.collection("flashcardSets").doc(setId).get();
    
    if (!docSnapshot.exists) {
      res.status(404).json({ message: "Flashcard set not found" });
      return;
    }
    
    // Return the set data
    res.status(200).json({
      id: docSnapshot.id,
      ...docSnapshot.data()
    });
  } catch (error) {
    console.error("Error getting flashcard set:", error);
    res.status(500).json({ 
      message: "Failed to get flashcard set",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete a flashcard set
export const deleteSet = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the set ID from the URL parameter
    const setId = req.params.id;
    
    // Get the user ID from the request (assuming it's available)
    const userId = req.body.userId || req.query.userId;
    
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    
    // Check if the document exists
    const docSnapshot = await db.collection("flashcardSets").doc(setId).get();
    
    if (!docSnapshot.exists) {
      res.status(404).json({ message: "Flashcard set not found" });
      return;
    }
    
    // Get the set data
    const setData = docSnapshot.data();
    
    // Check if the user is the owner of the set
    if (setData && setData.userId !== userId) {
      res.status(403).json({ message: "You do not have permission to delete this set" });
      return;
    }
    
    // Delete the document
    await db.collection("flashcardSets").doc(setId).delete();
    
    console.log('Successfully deleted set with ID:', setId);
    res.status(200).json({ 
      message: "Flashcard set deleted successfully",
      id: setId 
    });
  } catch (error) {
    console.error("Error deleting flashcard set:", error);
    res.status(500).json({ 
      message: "Failed to delete flashcard set",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get flashcard sets by class code (for public search)
export const getSetsByClassCode = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the class code from the query parameter
    const classCode = req.query.classCode as string;
    
    if (!classCode) {
      res.status(400).json({ message: "Class code is required" });
      return;
    }
    
    // Query for public sets where the classCode matches
    const setsSnapshot = await db.collection("flashcardSets")
      .where("classCode", "==", classCode.toUpperCase())
      .where("isPublic", "==", true)
      .orderBy("createdAt", "desc")
      .get();
    
    if (setsSnapshot.empty) {
      // No sets found, return empty array
      res.status(200).json([]);
      return;
    }
    
    // Define a type for the Firestore document data
    interface FlashcardSetData {
      id: string;
      title: string;
      classCode: string;
      description?: string;
      flashcards: Array<{question: string, answer: string}>;
      isPublic: boolean;
      icon?: string;
      createdAt: any; // Firestore timestamp
      userId: string;
      numCards: number;
      [key: string]: any; // Allow for additional fields
    }
    
    // Get all sets data including userId with proper typing
    const setsData = setsSnapshot.docs.map(doc => {
      const data = doc.data() as Partial<FlashcardSetData>;
      return {
        id: doc.id,
        ...data
      } as FlashcardSetData;
    });
    
    // Create a map of userIds to avoid duplicates (ES5 compatible)
    const userIdMap: { [key: string]: boolean } = {};
    setsData.forEach(set => {
      // Only add to map if userId exists and is a string
      if (set.userId && typeof set.userId === 'string') {
        userIdMap[set.userId] = true;
      }
    });
    
    // Convert map to array
    const userIds = Object.keys(userIdMap);
    
    // Fetch user information for each unique userId
    const userInfoMap: { [userId: string]: string | null } = {};
    
    // Use a for loop instead of Promise.all for better compatibility
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          userInfoMap[userId] = userData.username || userData.displayName || null;
        } else {
          userInfoMap[userId] = null;
        }
      } catch (error) {
        console.error(`Error fetching user info for ${userId}:`, error);
        userInfoMap[userId] = null;
      }
    }
    
    // Add username to each set
    const setsWithUserInfo = setsData.map(set => {
      // Handle case where userId might be undefined
      const userId = set.userId || '';
      const shortUserId = userId.length > 6 ? userId.substring(0, 6) : userId;
      
      return {
        ...set,
        createdBy: userId && userInfoMap[userId] ? userInfoMap[userId] : `User ${shortUserId}`
      };
    });
    
    console.log(`Found ${setsWithUserInfo.length} public sets for class code ${classCode}`);
    res.status(200).json(setsWithUserInfo);
  } catch (error) {
    console.error("Error getting sets by class code:", error);
    res.status(500).json({ 
      message: "Failed to get sets by class code",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Save an existing flashcard set to user's collection
export const saveSet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalSetId, userId } = req.body;

    if (!originalSetId || !userId) {
      res.status(400).json({ message: "Original set ID and user ID are required" });
      return;
    }

    const originalSetDoc = await db.collection("flashcardSets").doc(originalSetId).get();

    if (!originalSetDoc.exists) {
      res.status(404).json({ message: "Original set not found" });
      return;
    }

    const originalSetData = originalSetDoc.data();

    if (!originalSetData) {
      res.status(500).json({ message: "Error retrieving set data" });
      return;
    }

    // Check if user already saved this specific set (optional but good practice)
    const existingSavedQuery = await db.collection("flashcardSets")
        .where("userId", "==", userId)
        .where("originalSetId", "==", originalSetId)
        .limit(1)
        .get();

    if (!existingSavedQuery.empty) {
         res.status(409).json({ message: "You have already saved this set" });
         return;
    }


    const newSetId = db.collection("flashcardSets").doc().id;

    await db.collection("flashcardSets").doc(newSetId).set({
      ...originalSetData,
      id: newSetId, // Use the new ID
      userId: userId, // Assign to the saving user
      originalSetId: originalSetId, // Link to the original
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // New creation time for this copy
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Set initial update time
      isDerived: true, // Mark as saved/derived
      // Reset or adjust any fields specific to the original owner if needed
      // e.g., you might want isPublic to default to false for saved copies
      // isPublic: false, // Example: Default saved sets to private
      // icon: "/FliplyPNGs/private_flashcard.png" // Example: Update icon if defaulting to private
    });

    console.log(`User ${userId} successfully saved set ${originalSetId} as new set ${newSetId}`);
    res.status(201).json({
      message: "Set saved successfully",
      id: newSetId
    });
  } catch (error) {
    console.error("Error saving set:", error);
    res.status(500).json({
      message: "Failed to save set",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
