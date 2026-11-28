CREATE TABLE "PatternAnalysisCategory" (
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "PatternAnalysisCategory_pkey" PRIMARY KEY ("categoryId"),
    CONSTRAINT "PatternAnalysisCategory_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
