const Categories = require("../public/models/categorymodel");
const categoryCopy = require("../public/models/categorymodel");
const productCopy = require("../public/models/productmodel");
module.exports = {
  addcategory: async (req, res) => {
    console.log(req.body);
    try {
      const catename = req.body.cname.toLowerCase()
      categoryCopy.findOne({Catname: catename}).then(async (data)=> {
        if(data){
          return res.redirect("/admin/categories?err='The category is already exist Try to add a new one'");
        }else{
          const category = new categoryCopy({
            Catname: catename,
            Subcat: req.body.scateg,
          });
          await category.save();
          return res.redirect("/admin/categories");
        }
      })
      
    } catch (error) {
      const on = "On Adding Category";
      const err = error.message;
      res.redirect("/admin/error?err=" + err + "&on=" + on);
    }
  },
  getCategory: async (req, res) => {
    try {
      const categories = await Categories.find({});
      const err = req.query.err
      const productCount = await productCopy.aggregate([
        {
          $group: {
            _id: { $toLower: "$Category" }, // Convert category to lowercase
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            count: 1,
          },
        },
      ]);
      res.render("admin/categories", {
        categories: categories,
        pcount: productCount,
        err: err?err:null,
      });
    } catch (error) {
      const on = "On get Category";
      const err = error.message;
      res.redirect("/admin/error?err=" + err + "&on=" + on);
    }
  },
  editCategory: async (req, res) => {
    const catid = req.params.catid;
    const editedData = {
      Catname: req.body.cname,
      Subcat: req.body.scateg,
    };
    try {
      await categoryCopy.findByIdAndUpdate(catid, {
        $set: editedData,
      });
      res.redirect("/admin/categories");
    } catch (error) {
      const on = "On Edit Category";
      const err = error.message;
      res.redirect("/admin/error?err=" + err + "&on=" + on);
    }
  },
  deleteCategory: async (req, res) => {
    const catid = req.params.catid;
    try {
      await categoryCopy.findByIdAndRemove(catid);
      res.redirect("/admin/categories");
    } catch (error) {
      const on = "On Delete Category";
      const err = error.message;
      res.redirect("/admin/error?err=" + err + "&on=" + on);
    }
  },
};
