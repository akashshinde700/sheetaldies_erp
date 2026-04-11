const isValidId = (id) => Number.isInteger(id) && id > 0;

exports.activeFilter = (filter = {}) => ({
  ...filter,
  isActive: true,
});

exports.softDelete = async (model, id) => {
  if (!isValidId(id)) {
    throw new Error('Invalid ID for soft delete');
  }

  return model.update({
    where: { id },
    data: { isActive: false },
  });
};
