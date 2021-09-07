const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt")

const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING
})

User.hasMany(Note)
Note.belongsTo(User)

User.byToken = async (token) => {
  try {
    var userObj = await jwt.verify(token, process.env.JWT);
    if (userObj) {
      const user = await User.findByPk(userObj.user)
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username
    },
  });
  if (bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ user: user.id }, process.env.JWT);
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.beforeCreate(async(user, options)=>{
  const hashed = await bcrypt.hash(user.password, 5)
  user.password = hashed
})

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw"},
    { username: "moe", password: "moe_pw"},
    { username: "larry", password: "larry_pw"},
  ];
  const notes = [
    {text: "Hi! I am a note"},
    {text: "I love cooking with carbon steel"},
    {text: "Aesop has amazing products"}
  ]
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );

await lucy.setNotes(note1);
await moe.setNotes([note2, note3]);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      note1,
      note2,
      note3
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  },
};
