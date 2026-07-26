module.exports = function hasRole(
    interaction,
    roleId
){

    return interaction.member.roles.cache.has(
        roleId
    );

};