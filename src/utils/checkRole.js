module.exports = function hasRole(
    interaction,
    roleIds
) {

    return interaction.member.roles.cache.some(
        role => roleIds.includes(role.id)
    );

};