import User from "~/models/user";

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email });
};

export const findUserWithToken = async (email: string, token: string) => {
  return User.findOne({ email, emailVerificationToken: token });
};

export const findUserWithUsername = async (username: string) => {
  return User.findOne({ username });
};
