
 const logout = () => {
  // 1. Remove all items from storage
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("is_admin");
  localStorage.removeItem("user");

  // 2. Redirect the user to the login page
  window.location.href = "/login";
};
export default logout;