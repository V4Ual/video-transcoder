'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Videos extends Model {
    static associate(models) {
    }
  }
  Videos.init( {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    thumbnail: {
      type: DataTypes.STRING,
      get() {
        return process.env.BASE_URL+"public/" + this.getDataValue("thumbnail");
      },
    },
    video: {
      type: DataTypes.STRING,
      get() {
        return process.env.BASE_URL+"public/" + this.getDataValue("video");
      },
    },
  }, {
    sequelize,
    modelName: 'Videos',
  });
  return Videos;
};