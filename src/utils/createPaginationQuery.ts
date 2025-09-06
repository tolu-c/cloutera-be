export const createPaginationQuery = (page: number, limit: number) => {
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
  const skipNum = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skipNum };
};
