"use strict";

const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const Joi = require("joi");
const { sequelize } = require("../config/sequelize.config");
global.fetch = require("node-fetch");

const cognitoLogin = (cognitoUser, authenticationDetails) => {
  return new Promise(resolve => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: result => {
        resolve({
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken()
        });
      },
      onFailure: error => {
        throw error;
      }
    });
  });
};

const cognitoRefresh = (cognitoUser, RefreshToken) => {
  return new Promise(resolve => {
    cognitoUser.refreshSession(RefreshToken, (error, session) => {
      if (error) {
        throw error;
      }

      resolve({
        accessToken: session.accessToken.jwtToken,
        idToken: session.idToken.jwtToken,
        refreshToken: session.refreshToken.token
      });
    });
  });
};

const cognitoSignup = (cognitoUserPool, username, password, attributeList) => {
  return new Promise(resolve => {
    cognitoUserPool.signUp(
      username,
      password,
      attributeList,
      null,
      (error, result) => resolve({ error, result })
    );
  });
};

const confirmRegistration = (cognitoUserPool, code) => {
  return new Promise(resolve => {
    cognitoUserPool.confirmRegistration(code, true, (error, result) =>
      resolve({ error, result })
    );
  });
};

const resendConfirmationCode = cognitoUserPool => {
  return new Promise(resolve => {
    cognitoUserPool.resendConfirmationCode((error, result) =>
      resolve({ error, result })
    );
  });
};

module.exports.login = async ({ body }) => {
  try {
    const schema = Joi.object().keys({
      username: Joi.string().required(),
      password: Joi.string().required()
    });

    const { error, value } = Joi.validate(JSON.parse(body), schema);

    if (error) {
      if (error instanceof Error) {
        if (error.isJoi) {
          const { details } = error;

          console.log("details", details);
        }

        return {
          statusCode: 400,
          body: JSON.stringify(error.message, null, 2)
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify(error, null, 2)
        };
      }
    }

    const poolData = {
      UserPoolId: process.env.AWS_USER_POOL_ID,
      ClientId: process.env.AWS_CLIENT_ID
    };

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(
      {
        Username: value.username,
        Password: value.password
      }
    );

    const userData = {
      Username: value.username,
      Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    const result = await cognitoLogin(cognitoUser, authenticationDetails);

    return {
      statusCode: 200,
      body: JSON.stringify(result, null, 2)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }, null, 2)
    };
  }
};

module.exports.refreshToken = async ({ body }) => {
  try {
    const schema = Joi.object().keys({
      username: Joi.string().required(),
      refreshToken: Joi.string().required()
    });

    const { error, value } = Joi.validate(JSON.parse(body), schema);

    if (error) {
      if (error instanceof Error) {
        if (error.isJoi) {
          const { details } = error;

          console.log("details", details);
        }

        return {
          statusCode: 400,
          body: JSON.stringify(error.message, null, 2)
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify(error, null, 2)
        };
      }
    }

    const poolData = {
      UserPoolId: process.env.AWS_USER_POOL_ID,
      ClientId: process.env.AWS_CLIENT_ID
    };

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const RefreshToken = new AmazonCognitoIdentity.CognitoRefreshToken({
      RefreshToken: value.refreshToken
    });

    const userData = {
      Username: value.username,
      Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    const result = await cognitoRefresh(cognitoUser, RefreshToken);

    return {
      statusCode: 200,
      body: JSON.stringify(result, null, 2)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }, null, 2)
    };
  }
};

module.exports.signup = async ({ body }) => {
  try {
    const schema = Joi.object().keys({
      name: Joi.string().required(),
      username: Joi.string().required(),
      password: Joi.string().required()
    });

    const { error, value } = Joi.validate(JSON.parse(body), schema);

    if (error) {
      if (error instanceof Error) {
        if (error.isJoi) {
          const { details } = error;

          console.log("details", details);
        }

        return {
          statusCode: 400,
          body: JSON.stringify(error.message, null, 2)
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify(error, null, 2)
        };
      }
    }

    const nameSplit = value.name.split(" ");

    if (nameSplit.length <= 1) {
      return {
        statusCode: 400,
        body: JSON.stringify(
          { message: "Nome precisa ser primeiro nome e sobrenome" },
          null,
          2
        )
      };
    }

    const first_name = nameSplit[0];
    const last_name = nameSplit[nameSplit.length - 1];

    if (!last_name) {
      return {
        statusCode: 400,
        body: JSON.stringify(
          { message: "Nome precisa ser primeiro nome e sobrenome" },
          null,
          2
        )
      };
    }

    const poolData = {
      UserPoolId: process.env.AWS_USER_POOL_ID,
      ClientId: process.env.AWS_CLIENT_ID
    };

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const attributeList = [];

    const dataEmail = {
      Name: "email",
      Value: value.username
    };

    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(
      dataEmail
    );

    attributeList.push(attributeEmail);

    const result = await cognitoSignup(
      userPool,
      value.username,
      value.password,
      attributeList
    );

    if (result.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(result.error.message, null, 2)
      };
    }

    await sequelize.query(
      `
      insert into public.profile (
        hash,
        first_name,
        last_name
      ) values (
        :hash,
        :first_name,
        :last_name
      );
    `,
      {
        replacements: {
          hash: result.result.userSub,
          first_name,
          last_name
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(
        { message: "Cadastro realizado com sucesso, valide pelo seu email!" },
        null,
        2
      )
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }, null, 2)
    };
  }
};

module.exports.confirmRegistration = async ({ body }) => {
  try {
    const schema = Joi.object().keys({
      username: Joi.string().required(),
      code: Joi.string().required()
    });

    const { error, value } = Joi.validate(JSON.parse(body), schema);

    if (error) {
      if (error instanceof Error) {
        if (error.isJoi) {
          const { details } = error;

          console.log("details", details);
        }

        return {
          statusCode: 400,
          body: JSON.stringify(error.message, null, 2)
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify(error, null, 2)
        };
      }
    }

    const poolData = {
      UserPoolId: process.env.AWS_USER_POOL_ID,
      ClientId: process.env.AWS_CLIENT_ID
    };

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const userData = {
      Username: value.username,
      Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    const result = await confirmRegistration(cognitoUser, value.code);

    if (result.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(result.error.message, null, 2)
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email validado!" }, null, 2)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }, null, 2)
    };
  }
};

module.exports.resendConfirmationCode = async ({ body }) => {
  try {
    const schema = Joi.object().keys({
      username: Joi.string().required()
    });

    const { error, value } = Joi.validate(JSON.parse(body), schema);

    if (error) {
      if (error instanceof Error) {
        if (error.isJoi) {
          const { details } = error;

          console.log("details", details);
        }

        return {
          statusCode: 400,
          body: JSON.stringify(error.message, null, 2)
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify(error, null, 2)
        };
      }
    }

    const poolData = {
      UserPoolId: process.env.AWS_USER_POOL_ID,
      ClientId: process.env.AWS_CLIENT_ID
    };

    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const userData = {
      Username: value.username,
      Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    const result = await resendConfirmationCode(cognitoUser);

    if (result.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(result.error.message, null, 2)
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Código enviado!" }, null, 2)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }, null, 2)
    };
  }
};
